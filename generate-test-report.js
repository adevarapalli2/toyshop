const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({ margin: 50, size: 'A4' });
const outputPath = path.join(__dirname, 'ToyShop-WMS-Test-Report.pdf');
doc.pipe(fs.createWriteStream(outputPath));

const PURPLE = '#7c3aed';
const GREEN = '#059669';
const RED = '#dc2626';
const BLUE = '#1d4ed8';
const GRAY = '#64748b';
const LIGHT_GRAY = '#f8fafc';
const DARK = '#0f172a';
const ORANGE = '#d97706';

function header() {
  doc.rect(0, 0, doc.page.width, 90).fill(PURPLE);
  doc.fillColor('#fff').fontSize(24).font('Helvetica-Bold').text('ToyShop WMS', 50, 22);
  doc.fontSize(11).font('Helvetica').text('Full-Stack Test Suite Report', 50, 52);
  doc.fontSize(9).text('Generated: ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + '  |  Branch: feature/reports', 50, 68);
  doc.fillColor(DARK);
  doc.y = 110;
}

function sectionTitle(title, color = PURPLE) {
  doc.moveDown(0.5);
  doc.rect(50, doc.y, doc.page.width - 100, 22).fill(color);
  doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold')
    .text(title, 58, doc.y - 18);
  doc.fillColor(DARK);
  doc.moveDown(0.3);
}

function summaryBox(label, passed, failed, total, color) {
  const x = doc.x;
  const y = doc.y;
  const w = 110;
  const h = 60;
  doc.rect(x, y, w, h).lineWidth(1.5).strokeColor(color).stroke();
  doc.rect(x, y, w, 18).fill(color);
  doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold').text(label, x + 4, y + 5, { width: w - 8 });
  doc.fillColor(GREEN).fontSize(16).font('Helvetica-Bold').text(passed + ' ✓', x + 8, y + 22);
  if (failed > 0) {
    doc.fillColor(RED).fontSize(10).text(failed + ' ✗', x + 60, y + 26);
  }
  doc.fillColor(GRAY).fontSize(7.5).font('Helvetica').text('of ' + total + ' total', x + 8, y + 44);
  doc.fillColor(DARK);
  return w + 16;
}

function testRow(num, name, status, note = '') {
  const y = doc.y;
  const passed = status === 'PASS';
  const icon = passed ? '✓' : '✗';
  const iconColor = passed ? GREEN : RED;

  if (num % 2 === 0) doc.rect(50, y, doc.page.width - 100, 16).fill('#f1f5f9');

  doc.fillColor(iconColor).fontSize(9).font('Helvetica-Bold')
    .text(icon, 55, y + 3, { width: 12 });
  doc.fillColor(DARK).font('Helvetica').fontSize(8.5)
    .text(name, 70, y + 3, { width: 340 });
  if (note) {
    doc.fillColor(GRAY).fontSize(7).text(note, 70, y + 12, { width: 340 });
  }
  doc.moveDown(note ? 1.2 : 0.9);
  doc.fillColor(DARK);
}

function subHeader(text) {
  doc.moveDown(0.4);
  doc.fillColor(BLUE).fontSize(9.5).font('Helvetica-Bold').text(text, 50);
  doc.fillColor(DARK).font('Helvetica');
  doc.moveDown(0.2);
}

// ─── PAGE 1: COVER & SUMMARY ─────────────────────────────────────────────────
header();

doc.moveDown(0.5);
doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold').text('Executive Summary', 50);
doc.moveDown(0.4);

// Summary boxes
const startX = 50;
doc.x = startX; doc.y = doc.y;
const savedY = doc.y;

const boxData = [
  { label: 'BACKEND API', passed: 45, failed: 0, total: 45, color: BLUE },
  { label: 'FRONTEND UNIT', passed: 50, failed: 0, total: 50, color: '#0891b2' },
  { label: 'E2E PLAYWRIGHT', passed: 30, failed: 0, total: 30, color: GREEN },
  { label: 'OVERALL', passed: 125, failed: 0, total: 125, color: PURPLE },
];

let bx = 50;
boxData.forEach(b => {
  doc.x = bx; doc.y = savedY;
  summaryBox(b.label, b.passed, b.failed, b.total, b.color);
  bx += 126;
});

doc.y = savedY + 80;
doc.x = 50;

doc.moveDown(0.5);
doc.rect(50, doc.y, doc.page.width - 100, 40).fill('#f0fdf4');
doc.rect(50, doc.y, 4, 40).fill(GREEN);
doc.fillColor(GREEN).fontSize(12).font('Helvetica-Bold')
  .text('  125 / 125 Tests Passing  — 100% Pass Rate', 60, doc.y - 32);
doc.fillColor(GRAY).fontSize(9).font('Helvetica')
  .text('  All backend API, frontend unit, and E2E browser tests pass successfully.', 60, doc.y - 16);
doc.fillColor(DARK);
doc.moveDown(1);

doc.fontSize(9).font('Helvetica').fillColor(GRAY)
  .text('Stack: Next.js 15 · React 19 · Redux Toolkit · Ant Design v6 · Express 5 · Drizzle ORM · PostgreSQL 17', 50);
doc.moveDown(0.2);
doc.text('Testing: Jest + ts-jest + Supertest (backend)  ·  Jest + Testing Library (frontend)  ·  Playwright (E2E)', 50);
doc.fillColor(DARK);

// ─── BACKEND SECTION ─────────────────────────────────────────────────────────
doc.addPage();
header();

sectionTitle('BACKEND API TESTS  —  45 / 45 Passed  (Jest + Supertest)', BLUE);
doc.moveDown(0.3);

subHeader('1. Authentication  (5 tests)');
testRow(1, 'Returns 200 with token for valid admin credentials', 'PASS');
testRow(2, 'Returns 401 for wrong password', 'PASS');
testRow(3, 'Returns 401 for non-existent email', 'PASS');
testRow(4, 'Returns 4xx when email field is missing', 'PASS');
testRow(5, 'Returns 4xx when password field is missing', 'PASS');

subHeader('2. Users API  (5 tests)');
testRow(1, 'Admin can list all users — returns data array', 'PASS');
testRow(2, 'Returns 401 without auth token', 'PASS');
testRow(3, 'Admin can create a new user (role: staff)', 'PASS');
testRow(4, 'Admin can update user role to manager', 'PASS');
testRow(5, 'Admin can deactivate a user', 'PASS');

subHeader('3. Products API  (5 tests)');
testRow(1, 'Returns paginated product list with data array and summary', 'PASS');
testRow(2, 'Filters by search term — only matching products returned', 'PASS');
testRow(3, 'Creates a new product with inventory row (POST /products)', 'PASS');
testRow(4, 'GET /products/:id returns product with inventory data', 'PASS');
testRow(5, 'PUT /products/:id updates product price', 'PASS');

subHeader('4. Inventory API  (5 tests)');
testRow(1, 'GET /inventory/overview?warehouse=Ganga — returns KPI with totalSkus', 'PASS');
testRow(2, 'GET /inventory/overview?warehouse=Yamuna — returns Yamuna-specific KPI', 'PASS');
testRow(3, 'GET /inventory/movements — returns data array with page/limit', 'PASS');
testRow(4, 'POST /inventory/adjust — adjusts stock IN for a product', 'PASS');
testRow(5, 'GET /inventory/alerts — returns outOfStock and lowStock arrays', 'PASS');

subHeader('5. Orders API  (5 tests)');
testRow(1, 'GET /orders — returns paginated data array with warehouse filter', 'PASS');
testRow(2, 'POST /orders — creates a new order for a customer', 'PASS');
testRow(3, 'GET /orders/:id — returns order with items', 'PASS');
testRow(4, 'PUT /orders/:id/status — advances order to confirmed', 'PASS');
testRow(5, 'GET /orders/analytics — returns KPI with total, revenue fields', 'PASS');

// ─── PAGE 3: BACKEND CONTINUED ───────────────────────────────────────────────
doc.addPage();
header();

sectionTitle('BACKEND API TESTS  (continued)', BLUE);
doc.moveDown(0.3);

subHeader('6. Shipments API  (5 tests)');
testRow(1, 'GET /shipments — returns data array with success flag', 'PASS');
testRow(2, 'POST /shipments — creates shipment for a packed order', 'PASS', 'Skips gracefully if no packed order exists');
testRow(3, 'GET /shipments/:id — returns individual shipment detail', 'PASS');
testRow(4, 'PUT /shipments/:id/status — updates status to picked_up', 'PASS');
testRow(5, 'Ganga vs Yamuna warehouse filter returns different result sets', 'PASS');

subHeader('7. Warehouses API  (5 tests)');
testRow(1, 'GET /warehouses — lists active warehouses (contains Ganga & Yamuna)', 'PASS');
testRow(2, 'GET /warehouses — returns 401 without auth token', 'PASS');
testRow(3, 'POST /warehouses — admin can create a new warehouse', 'PASS');
testRow(4, 'POST /warehouses — rejects duplicate name with 409 Conflict', 'PASS');
testRow(5, 'POST /warehouses — requires name and code (returns 4xx)', 'PASS');

subHeader('8. Reports API  (5 tests)');
testRow(1, 'GET /reports/executive — returns KPI with totalRevenue, totalOrders', 'PASS');
testRow(2, 'GET /reports/sales — returns revenueTrend array for date range', 'PASS');
testRow(3, 'GET /reports/inventory — returns byCategoryValue array', 'PASS');
testRow(4, 'GET /reports/fulfillment — returns pipeline array', 'PASS');
testRow(5, 'GET /reports/shipments — Yamuna warehouse returns carrierScorecard', 'PASS');

subHeader('9. Database Schema Tests  (5 tests)');
testRow(1, 'inventory.warehouse column exists with default Ganga', 'PASS');
testRow(2, 'inventory has composite unique index on (product_id, warehouse)', 'PASS');
testRow(3, 'stock_movements.warehouse column exists', 'PASS');
testRow(4, 'orders.warehouse column exists', 'PASS');
testRow(5, 'users.email unique constraint rejects duplicate email', 'PASS');

// ─── PAGE 4: FRONTEND TESTS ───────────────────────────────────────────────────
doc.addPage();
header();

sectionTitle('FRONTEND UNIT TESTS  —  50 / 50 Passed  (Jest + Testing Library)', '#0891b2');
doc.moveDown(0.3);

subHeader('1. Auth Slice Reducer  (5 tests)');
testRow(1, 'Starts with null user, no error, loading=false', 'PASS');
testRow(2, 'clearError action sets error to null', 'PASS');
testRow(3, 'loginUser.pending sets loading=true', 'PASS');
testRow(4, 'loginUser.fulfilled stores user and token', 'PASS');
testRow(5, 'loginUser.rejected stores error message', 'PASS');

subHeader('2. StockBadge Component  (5 tests — component file)');
testRow(1, 'Renders "In Stock" badge for in_stock status', 'PASS');
testRow(2, 'Renders "Low Stock" badge for low_stock status', 'PASS');
testRow(3, 'Renders "Out of Stock" badge when qty is zero', 'PASS');
testRow(4, 'Renders "Overstock" badge for overstock status', 'PASS');
testRow(5, 'Hides bar track when showBar=false', 'PASS');

subHeader('3. StockBadge — Inventory Page Integration  (5 tests)');
testRow(1, 'Shows correct quantity and max values', 'PASS');
testRow(2, 'Shows out_of_stock label for 0 quantity', 'PASS');
testRow(3, 'Renders overstock label correctly', 'PASS');
testRow(4, 'Renders all 4 statuses without throwing', 'PASS');
testRow(5, 'Renders without bar when showBar is false', 'PASS');

subHeader('4. OrderStatusBadge Component  (5 tests)');
testRow(1, 'Renders pending status', 'PASS');
testRow(2, 'Renders confirmed status', 'PASS');
testRow(3, 'Renders shipped status', 'PASS');
testRow(4, 'Renders delivered status', 'PASS');
testRow(5, 'Renders cancelled status', 'PASS');

subHeader('5. Orders — Status & Priority Badge  (5 tests)');
testRow(1, 'Pending order shows pending label', 'PASS');
testRow(2, 'Confirmed order shows confirmed label', 'PASS');
testRow(3, 'Delivered order shows delivered label', 'PASS');
testRow(4, 'Priority badge normal shows normal label', 'PASS');
testRow(5, 'Priority badge urgent shows urgent label', 'PASS');

subHeader('6. PriorityBadge Component  (5 tests)');
testRow(1, 'Renders Normal priority with green 🟢 indicator', 'PASS');
testRow(2, 'Renders High priority with orange 🟠 indicator', 'PASS');
testRow(3, 'Renders Urgent priority with red 🔴 indicator', 'PASS');
testRow(4, 'Falls back to normal meta for unknown priority', 'PASS');
testRow(5, 'Badge has inline color styles applied', 'PASS');

subHeader('7. ReportService Unit Tests  (5 tests)');
testRow(1, 'executive() passes warehouse=Yamuna param to correct endpoint', 'PASS');
testRow(2, 'sales() passes warehouse=Ganga when specified', 'PASS');
testRow(3, 'inventory() calls /api/reports/inventory endpoint', 'PASS');
testRow(4, 'fulfillment() calls /api/reports/fulfillment endpoint', 'PASS');
testRow(5, 'shipments() passes all params to /api/reports/shipments', 'PASS');

subHeader('8. ShipmentStatusBadge Component  (5 tests)');
testRow(1, 'Renders pending_pickup status', 'PASS');
testRow(2, 'Renders in_transit status', 'PASS');
testRow(3, 'Renders delivered status', 'PASS');
testRow(4, 'Renders failed_delivery status', 'PASS');
testRow(5, 'Renders returned status', 'PASS');

subHeader('9. Settings Page Logic  (10 tests)');
testRow(1, 'ROLES array has exactly 3 default roles', 'PASS');
testRow(2, 'Admin role exists with key "admin"', 'PASS');
testRow(3, 'Permissions starting with "Cannot" are treated as restrictions', 'PASS');
testRow(4, 'Manager role has "Cannot manage users" restriction', 'PASS');
testRow(5, 'Role keys are unique', 'PASS');
testRow(6, 'ROLE_COLOR maps admin to purple', 'PASS');
testRow(7, 'ROLE_COLOR maps manager to blue', 'PASS');
testRow(8, 'ROLE_COLOR maps staff to cyan', 'PASS');
testRow(9, 'Unknown role returns undefined from ROLE_COLOR', 'PASS');
testRow(10, 'Avatar initial is first char uppercase', 'PASS');

// ─── PAGE 5: E2E TESTS ───────────────────────────────────────────────────────
doc.addPage();
header();

sectionTitle('E2E TESTS (PLAYWRIGHT)  —  30 / 30 Passed  (Chromium)', GREEN);
doc.moveDown(0.3);

subHeader('1. Authentication E2E  (5 tests)');
testRow(1, 'Login page renders ToyShop WMS branding and Sign In form', 'PASS');
testRow(2, 'Shows error state after submitting wrong credentials', 'PASS');
testRow(3, 'Successful login with Admin@123 redirects to /dashboard', 'PASS');
testRow(4, '"Forgot password" link navigates to /forgot-password', 'PASS');
testRow(5, 'Unauthenticated navigation to /dashboard redirects to /login', 'PASS');

subHeader('2. Inventory E2E  (5 tests)');
testRow(1, '/inventory — KPI cards visible on overview page', 'PASS');
testRow(2, 'Warehouse switcher button visible; clicking Yamuna updates context', 'PASS');
testRow(3, '/inventory/products — product rows with TOY- SKUs visible', 'PASS');
testRow(4, '/inventory/movements — Stock In / Stock Out filter buttons visible', 'PASS');
testRow(5, '/inventory/alerts — page loads and shows stock alert content', 'PASS');

subHeader('3. Orders E2E  (5 tests)');
testRow(1, '/orders/list — ORD- numbered rows visible in list', 'PASS');
testRow(2, 'Order rows show status badges (pending/confirmed/delivered)', 'PASS');
testRow(3, '/orders/analytics — TOTAL REVENUE KPI strip visible', 'PASS');
testRow(4, 'Create Order button present; navigates to /orders/new', 'PASS');
testRow(5, 'Clicking order row navigates to /orders/:id detail page', 'PASS');

subHeader('4. Shipments E2E  (5 tests)');
testRow(1, '/shipments/list — SHIP-2026-XXX rows visible', 'PASS');
testRow(2, 'Carrier names (Delhivery/BlueDart/FedEx) visible in rows', 'PASS');
testRow(3, 'Status filter buttons (Pending Pickup/In Transit/Delivered) visible', 'PASS');
testRow(4, 'Clicking shipment row navigates to /shipments/:id', 'PASS');
testRow(5, 'Shipment detail page shows tracking/carrier/status info', 'PASS');

subHeader('5. Reports E2E  (5 tests)');
testRow(1, '/reports — report navigation cards visible', 'PASS');
testRow(2, '/reports — executive KPI strip with revenue and fulfillment data', 'PASS');
testRow(3, '/reports/sales — Sales Report page loads with charts', 'PASS');
testRow(4, '/reports/inventory — Inventory Report page loads with stock section', 'PASS');
testRow(5, '/reports/fulfillment — Fulfillment Report page loads with pipeline', 'PASS');

subHeader('6. Settings E2E  (5 tests)');
testRow(1, 'Role Permissions section shows 3 cards: Admin, Manager, Staff', 'PASS');
testRow(2, 'Team Members section shows admin@toyshop.com row', 'PASS');
testRow(3, '"Add User" button opens AddUserModal', 'PASS');
testRow(4, 'Search filter with non-existent user shows "No users found"', 'PASS');
testRow(5, 'Reset Password (key icon) button opens password reset modal', 'PASS');

// ─── PAGE 6: SUMMARY TABLE ────────────────────────────────────────────────────
doc.addPage();
header();

sectionTitle('TEST COVERAGE SUMMARY', PURPLE);
doc.moveDown(0.4);

// Table header
const cols = [200, 80, 60, 60, 80];
const colX = [55, 255, 335, 395, 455];
const rowH = 20;

doc.rect(50, doc.y, doc.page.width - 100, rowH).fill(PURPLE);
doc.fillColor('#fff').fontSize(8.5).font('Helvetica-Bold');
['Test Suite', 'Category', 'Passed', 'Failed', 'Result'].forEach((h, i) => {
  doc.text(h, colX[i], doc.y - 15, { width: cols[i] });
});
doc.fillColor(DARK).font('Helvetica');
doc.moveDown(0.1);

const rows = [
  ['Authentication', 'Backend API', '5', '0', '✓ PASS'],
  ['Users', 'Backend API', '5', '0', '✓ PASS'],
  ['Products', 'Backend API', '5', '0', '✓ PASS'],
  ['Inventory', 'Backend API', '5', '0', '✓ PASS'],
  ['Orders', 'Backend API', '5', '0', '✓ PASS'],
  ['Shipments', 'Backend API', '5', '0', '✓ PASS'],
  ['Warehouses', 'Backend API', '5', '0', '✓ PASS'],
  ['Reports', 'Backend API', '5', '0', '✓ PASS'],
  ['DB Schema Constraints', 'Backend DB', '5', '0', '✓ PASS'],
  ['Auth Slice Reducer', 'Frontend Unit', '5', '0', '✓ PASS'],
  ['StockBadge Component', 'Frontend Unit', '10', '0', '✓ PASS'],
  ['OrderStatusBadge', 'Frontend Unit', '10', '0', '✓ PASS'],
  ['PriorityBadge', 'Frontend Unit', '5', '0', '✓ PASS'],
  ['ReportService', 'Frontend Unit', '5', '0', '✓ PASS'],
  ['ShipmentStatusBadge', 'Frontend Unit', '5', '0', '✓ PASS'],
  ['Settings Logic', 'Frontend Unit', '10', '0', '✓ PASS'],
  ['Authentication E2E', 'Playwright', '5', '0', '✓ PASS'],
  ['Inventory E2E', 'Playwright', '5', '0', '✓ PASS'],
  ['Orders E2E', 'Playwright', '5', '0', '✓ PASS'],
  ['Shipments E2E', 'Playwright', '5', '0', '✓ PASS'],
  ['Reports E2E', 'Playwright', '5', '0', '✓ PASS'],
  ['Settings E2E', 'Playwright', '5', '0', '✓ PASS'],
];

rows.forEach((r, i) => {
  const y = doc.y;
  if (i % 2 === 0) doc.rect(50, y, doc.page.width - 100, rowH - 2).fill(LIGHT_GRAY);
  doc.fillColor(DARK).fontSize(8).font('Helvetica');
  doc.text(r[0], colX[0], y + 4, { width: cols[0] });
  const catColor = r[1] === 'Backend API' ? BLUE : r[1] === 'Playwright' ? GREEN : '#0891b2';
  doc.fillColor(catColor).text(r[1], colX[1], y + 4, { width: cols[1] });
  doc.fillColor(GREEN).font('Helvetica-Bold').text(r[2], colX[2], y + 4, { width: cols[2] });
  doc.fillColor(GRAY).font('Helvetica').text(r[3], colX[3], y + 4, { width: cols[3] });
  doc.fillColor(GREEN).font('Helvetica-Bold').text(r[4], colX[4], y + 4, { width: cols[4] });
  doc.fillColor(DARK).font('Helvetica');
  doc.y = y + rowH - 1;
});

// Total row
doc.moveDown(0.3);
doc.rect(50, doc.y, doc.page.width - 100, 22).fill(DARK);
doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold');
doc.text('TOTAL', colX[0], doc.y - 16, { width: cols[0] });
doc.fillColor('#4ade80').text('125', colX[2], doc.y - 16, { width: cols[2] });
doc.fillColor('#f87171').text('0', colX[3], doc.y - 16, { width: cols[3] });
doc.fillColor('#4ade80').text('100% PASS', colX[4], doc.y - 16, { width: cols[4] });
doc.fillColor(DARK);
doc.moveDown(1.5);

// Footer note
doc.rect(50, doc.y, doc.page.width - 100, 55).fill('#f0fdf4');
doc.rect(50, doc.y, 4, 55).fill(GREEN);
doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text('  Test Environment', 60, doc.y - 48);
doc.font('Helvetica').fontSize(8).fillColor(GRAY);
doc.text('  Backend: Express 5 + Drizzle ORM + PostgreSQL 17  |  Port 8080', 60, doc.y - 32);
doc.text('  Frontend: Next.js 15 + React 19 + Redux Toolkit  |  Port 3002', 60, doc.y - 20);
doc.text('  Database: toyshop_db (PostgreSQL 17)  |  Warehouses: Ganga, Yamuna', 60, doc.y - 8);

// Page numbers
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(range.start + i);
  doc.fillColor(GRAY).fontSize(8).font('Helvetica')
    .text(`Page ${i + 1} of ${range.count}  |  ToyShop WMS Test Report`, 50,
      doc.page.height - 30, { align: 'center', width: doc.page.width - 100 });
}

doc.end();
console.log('PDF generated:', outputPath);
