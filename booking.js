(() => {
  const SUPABASE_URL = 'https://tixunatviwaaeqlbbqer.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpeHVuYXR2aXdhYWVxbGJicWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNzI3MTUsImV4cCI6MjEwMjc0ODcxNX0.X-tbjxy0oYxV_5DpnSjQm2JqlTobKPnoTybFKwOzKLA';

  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const iso = (date) => date.toISOString().slice(0, 10);
  const addDays = (date, days) => new Date(date.getTime() + days * 86400000);
  const nightsBetween = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000);

  const overlay = document.createElement('div');
  overlay.className = 'booking-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <section class="booking-shell" role="dialog" aria-modal="true" aria-labelledby="booking-title">
      <header class="booking-head">
        <div>
          <p class="booking-kicker">YOUR BUHANGA STAY</p>
          <h2 id="booking-title">Choose your<br><em>time away.</em></h2>
        </div>
        <button class="booking-close" type="button" aria-label="Close booking">×</button>
      </header>
      <div class="booking-body">
        <div class="booking-badge">Live lodge availability</div>
        <p class="booking-note">Start with your dates. We’ll show only stays that can host your party, then hold your selected accommodation while the lodge team reviews the reservation.</p>

        <form id="booking-form">
          <div class="booking-grid">
            <div class="booking-field"><label for="booking-check-in">Check in</label><input id="booking-check-in" name="check_in" type="date" required></div>
            <div class="booking-field"><label for="booking-check-out">Check out</label><input id="booking-check-out" name="check_out" type="date" required></div>
            <div class="booking-field"><label for="booking-adults">Adults</label><select id="booking-adults" name="adults">${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(n => `<option value="${n}" ${n === 2 ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
            <div class="booking-field"><label for="booking-children">Children</label><select id="booking-children" name="children">${[0,1,2,3,4,5,6].map(n => `<option value="${n}">${n}</option>`).join('')}</select></div>
          </div>

          <div class="booking-actions" id="availability-actions">
            <button class="booking-primary" type="button" id="check-availability">Check availability</button>
          </div>
          <p class="booking-error" id="booking-error" role="alert"></p>

          <div id="booking-results" hidden>
            <div class="booking-summary" id="stay-summary"></div>
            <div class="booking-field full">
              <label>Available stays</label>
              <div class="room-choice-list" id="room-choices"></div>
            </div>
          </div>

          <div id="guest-details" hidden>
            <div class="booking-grid" style="margin-top:28px">
              <div class="booking-field"><label for="guest-name">Full name</label><input id="guest-name" name="guest_name" autocomplete="name" required></div>
              <div class="booking-field"><label for="guest-email">Email</label><input id="guest-email" name="guest_email" type="email" autocomplete="email" required></div>
              <div class="booking-field"><label for="guest-phone">Phone / WhatsApp</label><input id="guest-phone" name="guest_phone" type="tel" autocomplete="tel"></div>
              <div class="booking-field"><label for="guest-country">Country</label><input id="guest-country" name="country" autocomplete="country-name"></div>
              <div class="booking-field full"><label for="guest-request">Anything we should prepare?</label><textarea id="guest-request" name="special_requests" placeholder="Airport transfer, dietary preferences, celebration, trekking plans…"></textarea></div>
            </div>
            <div class="booking-summary" id="price-summary"></div>
            <div class="booking-actions">
              <button class="booking-primary" type="submit" id="submit-booking">Request this stay</button>
              <button class="booking-secondary" type="button" id="change-dates">Change dates</button>
            </div>
            <p class="booking-help">Your reservation is recorded immediately as a 24-hour pending hold. Buhanga Eco Lodge will confirm the stay and final arrangements directly with you. Rates shown are the lodge’s published starting rates; extras and special arrangements may change the final amount.</p>
          </div>

          <div id="booking-success" hidden></div>
        </form>
      </div>
    </section>`;
  document.body.appendChild(overlay);

  const form = overlay.querySelector('#booking-form');
  const checkIn = overlay.querySelector('#booking-check-in');
  const checkOut = overlay.querySelector('#booking-check-out');
  const adults = overlay.querySelector('#booking-adults');
  const children = overlay.querySelector('#booking-children');
  const results = overlay.querySelector('#booking-results');
  const guestDetails = overlay.querySelector('#guest-details');
  const roomChoices = overlay.querySelector('#room-choices');
  const staySummary = overlay.querySelector('#stay-summary');
  const priceSummary = overlay.querySelector('#price-summary');
  const errorBox = overlay.querySelector('#booking-error');
  const successBox = overlay.querySelector('#booking-success');
  const checkButton = overlay.querySelector('#check-availability');
  const submitButton = overlay.querySelector('#submit-booking');
  const changeDates = overlay.querySelector('#change-dates');

  checkIn.min = iso(today);
  checkIn.value = iso(addDays(today, 7));
  checkOut.min = iso(addDays(today, 1));
  checkOut.value = iso(addDays(today, 9));

  let rooms = [];
  let selectedRoom = null;

  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
  };

  const showError = (message = '') => {
    errorBox.textContent = message;
    errorBox.classList.toggle('show', Boolean(message));
  };

  const openBooking = (preferredRoom = '') => {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (preferredRoom) overlay.dataset.preferredRoom = preferredRoom;
    setTimeout(() => checkIn.focus(), 60);
  };

  const closeBooking = () => {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  overlay.querySelector('.booking-close').addEventListener('click', closeBooking);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) closeBooking(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && overlay.classList.contains('open')) closeBooking(); });

  document.querySelectorAll('.book-link,.cta-button,.stay-card-overlay a,.text-card .text-link,.wellness .text-link,.mobile-panel a:last-child').forEach((link) => {
    link.classList.add('booking-trigger');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const text = `${link.textContent} ${link.getAttribute('href') || ''}`.toLowerCase();
      const preferred = text.includes('presidential') ? 'presidential-villa' : text.includes('vip') ? 'vip-villa' : text.includes('cottage') ? 'private-cottage' : '';
      openBooking(preferred);
    });
  });

  checkIn.addEventListener('change', () => {
    const next = addDays(new Date(`${checkIn.value}T12:00:00`), 1);
    checkOut.min = iso(next);
    if (!checkOut.value || checkOut.value <= checkIn.value) checkOut.value = iso(next);
  });

  const renderRoomChoices = () => {
    const preferred = overlay.dataset.preferredRoom || '';
    roomChoices.innerHTML = rooms.length ? rooms.map((room, index) => {
      const isPreferred = room.id === preferred || (!preferred && index === 0);
      return `<label class="room-choice">
        <input type="radio" name="room_type" value="${room.id}" ${isPreferred ? 'checked' : ''}>
        <span><strong>${room.name}</strong><small>${room.short_description || ''}</small><span>From ${money.format(Number(room.nightly_rate_usd))} / night · ${room.board_basis} · ${room.available_units} available</span></span>
      </label>`;
    }).join('') : '<p class="booking-note">No accommodation matches these dates and guest count. Try nearby dates or reduce the number of guests.</p>';

    const selected = roomChoices.querySelector('input:checked');
    selectedRoom = selected ? rooms.find(room => room.id === selected.value) : null;
    guestDetails.hidden = !selectedRoom;
    updatePriceSummary();

    roomChoices.querySelectorAll('input[name="room_type"]').forEach((radio) => radio.addEventListener('change', () => {
      selectedRoom = rooms.find(room => room.id === radio.value);
      guestDetails.hidden = false;
      updatePriceSummary();
    }));
  };

  const updatePriceSummary = () => {
    if (!selectedRoom) return;
    const nights = nightsBetween(checkIn.value, checkOut.value);
    const total = nights * Number(selectedRoom.nightly_rate_usd);
    priceSummary.innerHTML = `
      <div class="booking-summary-row"><span>${selectedRoom.name}</span><strong>${money.format(Number(selectedRoom.nightly_rate_usd))} × ${nights} night${nights === 1 ? '' : 's'}</strong></div>
      <div class="booking-summary-row"><span>Published stay estimate</span><strong class="booking-total">${money.format(total)}</strong></div>`;
  };

  checkButton.addEventListener('click', async () => {
    showError();
    successBox.hidden = true;
    if (!checkIn.value || !checkOut.value || checkOut.value <= checkIn.value) {
      showError('Choose valid check-in and check-out dates.');
      return;
    }
    if (new Date(`${checkIn.value}T00:00:00`) < today) {
      showError('Check-in cannot be in the past.');
      return;
    }

    checkButton.disabled = true;
    checkButton.textContent = 'Checking…';
    const guests = Number(adults.value) + Number(children.value);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/buhanga_available_rooms`, {
        method: 'POST', headers,
        body: JSON.stringify({ p_check_in: checkIn.value, p_check_out: checkOut.value, p_guests: guests })
      });
      if (!response.ok) throw new Error('Availability could not be loaded. Please try again.');
      rooms = await response.json();
      const nights = nightsBetween(checkIn.value, checkOut.value);
      staySummary.innerHTML = `<div class="booking-summary-row"><span>Stay</span><strong>${checkIn.value} → ${checkOut.value}</strong></div><div class="booking-summary-row"><span>Guests</span><strong>${guests} guest${guests === 1 ? '' : 's'} · ${nights} night${nights === 1 ? '' : 's'}</strong></div>`;
      results.hidden = false;
      renderRoomChoices();
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      showError(error.message || 'Could not check availability.');
    } finally {
      checkButton.disabled = false;
      checkButton.textContent = 'Check availability';
    }
  });

  changeDates.addEventListener('click', () => {
    selectedRoom = null;
    rooms = [];
    results.hidden = true;
    guestDetails.hidden = true;
    checkIn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError();
    if (!selectedRoom) {
      showError('Choose an available stay first.');
      return;
    }
    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    submitButton.textContent = 'Holding your stay…';
    const payload = {
      p_room_type_id: selectedRoom.id,
      p_check_in: checkIn.value,
      p_check_out: checkOut.value,
      p_adults: Number(adults.value),
      p_children: Number(children.value),
      p_guest_name: form.guest_name.value,
      p_guest_email: form.guest_email.value,
      p_guest_phone: form.guest_phone.value || null,
      p_country: form.country.value || null,
      p_special_requests: form.special_requests.value || null
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/buhanga_create_reservation`, {
        method: 'POST', headers, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'We could not place this reservation hold. Please try again.');
      const booking = Array.isArray(data) ? data[0] : data;
      results.hidden = true;
      guestDetails.hidden = true;
      overlay.querySelector('#availability-actions').hidden = true;
      successBox.hidden = false;
      successBox.innerHTML = `
        <div class="booking-badge">Stay held successfully</div>
        <h3 style="font:500 42px/1.05 'Playfair Display',serif;margin:0 0 18px">Your quiet is<br><em>waiting.</em></h3>
        <p class="booking-note">Reservation <strong>${booking.reservation_code}</strong> is now recorded for ${selectedRoom.name}. The lodge team can review and confirm it directly with you.</p>
        <div class="booking-summary"><div class="booking-summary-row"><span>Dates</span><strong>${checkIn.value} → ${checkOut.value}</strong></div><div class="booking-summary-row"><span>Published stay estimate</span><strong class="booking-total">${money.format(Number(booking.total_usd))}</strong></div><div class="booking-summary-row"><span>Status</span><strong>Pending confirmation · 24-hour hold</strong></div></div>
        <div class="booking-actions"><a class="booking-primary" href="mailto:reservations@buhangaecolodge.com?subject=${encodeURIComponent(`Reservation ${booking.reservation_code}`)}&body=${encodeURIComponent(`Hello Buhanga Eco Lodge,\n\nI have placed reservation ${booking.reservation_code} through the website for ${selectedRoom.name}, ${checkIn.value} to ${checkOut.value}.\n\nPlease confirm the stay and next steps.\n\nThank you.`)}">Contact reservations</a><button class="booking-secondary" type="button" id="finish-booking">Return to the story</button></div>`;
      successBox.querySelector('#finish-booking').addEventListener('click', closeBooking);
      successBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      showError(error.message || 'Could not create reservation.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Request this stay';
    }
  });
})();
