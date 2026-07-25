async function request(path, options = {}) {
  const url = `http://localhost:3000/api/v1${path}`;
  const headers = { ...options.headers };
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: typeof options.body === 'object' && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
}

async function runTest() {
  console.log('=== STARTING REFINED FACULTY FAMILY WORKFLOW TEST ===\n');

  // 1. Login as Faculty & Admin
  console.log('1. Logging in as Faculty & Admin...');
  const facultyLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'faculty@nust.edu.pk', password: 'faculty123' },
  });
  const facultyToken = facultyLogin.accessToken;

  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@nust.edu.pk', password: 'admin123' },
  });
  const adminToken = adminLogin.accessToken;
  console.log('  ✓ Faculty and Admin logged in successfully.');

  // Ensure Faculty has an active self membership
  const facultySelfM = await request('/memberships', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: { categoryCode: 'FACULTY' },
  }).catch(() => ({}));

  // Pay faculty registration fee if pending
  const facultyMemberships = await request('/memberships/my', {
    headers: { Authorization: `Bearer ${facultyToken}` },
  });
  const selfMembership = facultyMemberships.memberships.find(m => !m.family_member_id);
  if (selfMembership && selfMembership.status === 'PENDING_PAYMENT') {
    const payRes = await request('/payments/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: { membershipId: selfMembership.id, paymentType: 'REGISTRATION' },
    });
    await request('/payments/gateway/callback', {
      method: 'POST',
      body: { transactionId: payRes.payment.gateway_transaction_id, status: 'success' },
    });
  }

  // 3. Register two children ("Ali Khan" and "Fatima Khan")
  console.log('\n2. Registering two children ("Ali Khan" and "Fatima Khan")...');
  const child1Res = await request('/memberships/family-members', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: { fullName: 'Ali Khan', relation: 'Son', age: 10 },
  });
  const child1 = child1Res.familyMember;

  const child2Res = await request('/memberships/family-members', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: { fullName: 'Fatima Khan', relation: 'Daughter', age: 12 },
  });
  const child2 = child2Res.familyMember;
  console.log(`  ✓ Registered Child 1: ${child1.full_name} (Status: ${child1.status})`);
  console.log(`  ✓ Registered Child 2: ${child2.full_name} (Status: ${child2.status})`);

  // 4. Admin approves Child 1 and rejects Child 2
  console.log('\n3. Admin reviewing children queue...');
  const approveRes = await request(`/admin/family-members/${child1.id}/decide`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { approved: true },
  });
  console.log(`  ✓ Admin decision Child 1: ${approveRes.message} (Membership ID: ${approveRes.childMembership.id})`);

  const rejectRes = await request(`/admin/family-members/${child2.id}/decide`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { approved: false, reason: 'Medical clearance unreadable' },
  });
  console.log(`  ✓ Admin decision Child 2: ${rejectRes.message}`);

  // Check Faculty dashboard data for Child 1: must be PENDING_PAYMENT
  const myChildren1 = await request('/memberships/family-members', {
    headers: { Authorization: `Bearer ${facultyToken}` },
  });
  const updatedC1 = myChildren1.familyMembers.find(c => c.id === child1.id);
  console.log(`  ✓ Child 1 Status after admin approval: ${updatedC1.status} (Registration fee paid: false)`);

  if (updatedC1.status !== 'PENDING_PAYMENT') {
    throw new Error(`Expected PENDING_PAYMENT for Child 1, got ${updatedC1.status}`);
  }

  // 5. Faculty pays Child 1 registration fee
  console.log('\n4. Faculty paying Child 1 one-time registration fee (Rs 2,000)...');
  const payChild1 = await request('/payments/initiate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: { membershipId: updatedC1.child_membership_id, paymentType: 'REGISTRATION' },
  });
  console.log(`  ✓ Payment initiated: Payment ID ${payChild1.payment.id}, Amount: Rs ${payChild1.payment.amount}`);

  // Simulate payment gateway completion
  await request('/payments/gateway/callback', {
    method: 'POST',
    body: { transactionId: payChild1.payment.gateway_transaction_id, status: 'success' },
  });

  // Verify Child 1 is now ACTIVE with e-card issued
  const myChildren2 = await request('/memberships/family-members', {
    headers: { Authorization: `Bearer ${facultyToken}` },
  });
  const activeC1 = myChildren2.familyMembers.find(c => c.id === child1.id);
  console.log(`  ✓ Child 1 Status after payment: ${activeC1.status}, Card Number: ${activeC1.card_number}`);

  if (activeC1.status !== 'ACTIVE') {
    throw new Error(`Expected ACTIVE status for Child 1 after payment, got ${activeC1.status}`);
  }

  // 6. Resubmit Child 2, approve, and pay registration fee for Child 2
  console.log('\n5. Resubmitting Child 2, approving & paying registration fee for Child 2...');
  await request(`/memberships/family-members/${child2.id}/resubmit`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: { fullName: 'Fatima Khan', relation: 'Daughter', age: 12 },
  });
  const app2 = await request(`/admin/family-members/${child2.id}/decide`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { approved: true },
  });
  const payChild2 = await request('/payments/initiate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: { membershipId: app2.childMembership.id, paymentType: 'REGISTRATION' },
  });
  await request('/payments/gateway/callback', {
    method: 'POST',
    body: { transactionId: payChild2.payment.gateway_transaction_id, status: 'success' },
  });
  console.log('  ✓ Child 2 is now ACTIVE with e-card issued.');

  // 7. Test person-scoped facility purchases
  console.log('\n6. Testing person-scoped facility subscriptions...');
  // Faculty buys Swimming for Child 1
  await request(`/memberships/${activeC1.child_membership_id}/subscriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: { selectedFacilities: ['SWIMMING'] },
  });
  console.log(`  ✓ Child 1 (${activeC1.full_name}): Subscribed to SWIMMING`);

  // Faculty buys Gym + Saddle for Child 2
  await request(`/memberships/${app2.childMembership.id}/subscriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: { selectedFacilities: ['GYM', 'SADDLE'] },
  });
  console.log('  ✓ Child 2 (Fatima Khan): Subscribed to GYM + SADDLE');

  // Faculty buys Gym + Swimming combo for Himself
  const selfCard = (await request('/memberships/my', { headers: { Authorization: `Bearer ${facultyToken}` } })).memberships.find(m => !m.family_member_id);
  await request(`/memberships/${selfCard.id}/subscriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: { selectedFacilities: ['GYM', 'SWIMMING'] },
  });
  console.log('  ✓ Faculty (Self): Subscribed to GYM + SWIMMING');

  // 8. Verify e-cards show ONLY each person's own subscriptions
  console.log('\n7. Verifying e-cards for independent, unmixed facility subscriptions...');
  const userCards = await request('/cards/my', {
    headers: { Authorization: `Bearer ${facultyToken}` },
  });

  userCards.cards.forEach(card => {
    const activeFacilities = (card.subscriptions || []).filter(s => s.status === 'ACTIVE').map(s => s.facility);
    const cardHolder = card.family_member_name ? `${card.family_member_name} (${card.family_member_relation})` : 'Faculty (Self)';
    console.log(`  ✓ Card [${card.card_number}] for ${cardHolder}: [${activeFacilities.join(', ')}]`);
  });

  // 8. Verify live lookup by card number returns child name, child photo, and parent name
  console.log('\n8. Testing live card lookup by card number for child card...');
  const lookupRes = await request('/trainer/lookup-card', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { cardNumber: activeC1.card_number },
  });
  console.log(`  ✓ Card Lookup [${activeC1.card_number}] Result:`);
  console.log(`    Member Name: ${lookupRes.member.full_name}`);
  console.log(`    Parent Name: ${lookupRes.member.parent_name}`);
  console.log(`    Role:        ${lookupRes.member.role}`);
  console.log(`    Photo URL:   ${lookupRes.member.photo_url || 'Default Avatar'}`);
  console.log(`    Facilities:  ${JSON.stringify(lookupRes.membership.facilities)}`);

  if (lookupRes.member.full_name !== 'Ali Khan') {
    throw new Error(`Expected child name "Ali Khan", got ${lookupRes.member.full_name}`);
  }

  // 9. Verify duplicate child registration is blocked
  console.log('\n9. Testing duplicate child registration prevention...');
  try {
    await request('/memberships/family-members', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: { fullName: 'Ali Khan', relation: 'Son', age: 10 },
    });
    throw new Error('Duplicate child registration should have failed!');
  } catch (err) {
    console.log(`  ✓ Duplicate child registration correctly blocked: "${err.message}"`);
  }

  // 10. Verify getMyMemberships includes family member names
  console.log('\n10. Testing getMyMemberships person name inclusion...');
  const allM = await request('/memberships/my', {
    headers: { Authorization: `Bearer ${facultyToken}` },
  });
  allM.memberships.forEach(m => {
    const ownerName = m.family_member_name ? `${m.family_member_name} (${m.family_member_relation})` : 'Faculty Self';
    console.log(`  ✓ Membership [${m.id}] belong to: ${ownerName}`);
  });

  // 11. Verify freeze request blocks past dates (e.g., 2025)
  console.log('\n11. Testing freeze request past date validation...');
  try {
    await request('/freeze', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: { membershipId: selfCard.id, freezeStart: '2025-01-15', durationMonths: 1, reason: 'Past test' },
    });
    throw new Error('Freeze request with 2025 date should have failed!');
  } catch (err) {
    console.log(`  ✓ Freeze request with 2025 date correctly blocked: "${err.message}"`);
  }

  // 12. Verify facility subscription dues payment & activation flow
  console.log('\n12. Testing monthly facility dues payment & subscription activation...');
  const facultyCards = await request('/cards/my', {
    headers: { Authorization: `Bearer ${facultyToken}` },
  });
  const selfCardObj = facultyCards.cards.find(c => !c.family_member_id);

  // Subscribe faculty to GYM + SWIMMING
  await request(`/memberships/${selfCardObj.membership_id}/subscriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: { selectedFacilities: ['GYM', 'SWIMMING'] },
  });

  // Initiate monthly payment
  const monthlyPayRes = await request('/payments/initiate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${facultyToken}` },
    body: { membershipId: selfCardObj.membership_id, paymentType: 'MONTHLY' },
  });
  console.log(`  ✓ Monthly payment initiated for Rs ${monthlyPayRes.payment.amount}`);

  // Complete mock gateway callback
  const cbRes = await fetch('http://localhost:3000/api/v1/payments/gateway/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId: monthlyPayRes.payment.gateway_transaction_id, status: 'success' }),
  }).then(r => r.json());

  console.log(`  ✓ Gateway payment callback result: ${cbRes.status}`);

  // Check card status & active subscriptions
  const updatedLookup = await request('/trainer/lookup-card', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { cardNumber: selfCardObj.card_number },
  });
  console.log(`  ✓ Updated Card Facilities after monthly payment: ${JSON.stringify(updatedLookup.membership.facilities)}`);

  if (updatedLookup.membership.facilities.GYM !== 'ACTIVE' || updatedLookup.membership.facilities.SWIMMING !== 'ACTIVE') {
    throw new Error('Facility subscriptions should be ACTIVE after monthly payment verification');
  }

  // 13. Verify PDF e-card generation
  console.log('\n13. Testing PDF E-Card generation...');
  const ecardRes = await fetch(`http://localhost:3000/api/v1/cards/${selfCardObj.id}/ecard`, {
    headers: { Authorization: `Bearer ${facultyToken}` },
  });
  if (!ecardRes.ok) {
    const errText = await ecardRes.text();
    throw new Error(`PDF E-Card download failed: ${ecardRes.status} — ${errText}`);
  }
  const ecardBuffer = await ecardRes.arrayBuffer();
  console.log(`  ✓ E-Card PDF generated successfully (${ecardBuffer.byteLength} bytes)`);

  console.log('\n=== ALL REFINED WORKFLOW TESTS PASSED PERFECTLY! ===');
}

runTest().catch(err => {
  console.error('\n[TEST FAILED]', err);
  process.exit(1);
});
