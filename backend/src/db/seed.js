// 25 tasks across 5 categories. Adjust names/categories to match app.padosipro.com if you like.
const TASKS = [
  // Home Care
  ['Deep Home Cleaning', 'Home Care', 'Full-home deep clean including kitchen, bathrooms and floors.'],
  ['Plumber or Electrician Visit', 'Home Care', 'Book a trusted professional for repairs and installations.'],
  ['Appliance Repair', 'Home Care', 'Repair or service AC, washing machine, fridge and more.'],
  ['Pest Control', 'Home Care', 'Schedule a safe, certified pest control treatment.'],
  ['Laundry and Ironing', 'Home Care', 'Pickup and delivery of washed and ironed clothes.'],
  // Bills & Paperwork
  ['Pay Utility Bills', 'Bills & Paperwork', 'Electricity, water, gas and internet bills paid on time.'],
  ['Insurance Renewal', 'Bills & Paperwork', 'Track and renew health, vehicle and home insurance.'],
  ['Government Documents', 'Bills & Paperwork', 'Help with Aadhaar, PAN, passport and other documents.'],
  ['Tax Filing Support', 'Bills & Paperwork', 'Gather paperwork and coordinate with your tax consultant.'],
  ['Bank and KYC Errands', 'Bills & Paperwork', 'Handle bank visits, KYC updates and account paperwork.'],
  // Health & Wellness
  ['Doctor Appointment Booking', 'Health & Wellness', 'Find a specialist and book a convenient slot.'],
  ['Home Lab Tests', 'Health & Wellness', 'Sample collection at home with reports delivered digitally.'],
  ['Medicine Delivery', 'Health & Wellness', 'Regular or urgent medicine orders delivered to your door.'],
  ['Fitness Trainer', 'Health & Wellness', 'Personal trainer or yoga instructor at your place or online.'],
  ['Elder Care Visit', 'Health & Wellness', 'Regular check-ins and assistance for elderly family members.'],
  // Travel & Events
  ['Flight and Train Booking', 'Travel & Events', 'Compare options and book tickets within your budget.'],
  ['Hotel Booking', 'Travel & Events', 'Shortlist and reserve stays that match your preferences.'],
  ['Cab and Airport Transfers', 'Travel & Events', 'Pre-arranged rides for airport, station or outstation trips.'],
  ['Birthday and Party Planning', 'Travel & Events', 'Venue, decor, food and entertainment sorted for you.'],
  ['Gift Sourcing and Delivery', 'Travel & Events', 'Pick, wrap and deliver the perfect gift on time.'],
  // Shopping & Errands
  ['Grocery Shopping', 'Shopping & Errands', 'Weekly or monthly grocery runs from your preferred stores.'],
  ['Courier and Parcel Pickup', 'Shopping & Errands', 'Send or collect documents and parcels without leaving home.'],
  ['Furniture Assembly', 'Shopping & Errands', 'Assembly and installation of new furniture.'],
  ['Vehicle Servicing', 'Shopping & Errands', 'Pickup, service and drop-off for your car or bike.'],
  ['Pet Care', 'Shopping & Errands', 'Grooming, vet visits, walking and pet supplies.'],
];

const { runInTransaction } = require('./database');

/** Idempotent: safe to call on every server start (INSERT OR IGNORE on unique name). */
function seedTasks(db) {
  const insert = db.prepare('INSERT OR IGNORE INTO tasks (name, category, description) VALUES (?, ?, ?)');
  runInTransaction(db, () => {
    for (const row of TASKS) insert.run(...row);
  });
}

module.exports = { seedTasks, TASKS };
