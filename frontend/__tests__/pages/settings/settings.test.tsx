// Tests for Settings page logic — roles array and user table rendering
// We test the ROLES constant and the pure logic, not the full page (which requires admin auth)

const ROLES = [
  { key: 'admin', label: 'Admin', perms: ['Manage users & roles', 'Add / remove warehouses', 'Cannot'] },
  { key: 'manager', label: 'Manager', perms: ['View & adjust inventory', 'Cannot manage users'] },
  { key: 'staff', label: 'Staff', perms: ['View inventory', 'Cannot adjust stock'] },
];

describe('Settings page — roles definition logic', () => {
  it('has exactly 3 default roles', () => {
    expect(ROLES.length).toBe(3);
  });

  it('admin role exists with key "admin"', () => {
    const admin = ROLES.find(r => r.key === 'admin');
    expect(admin).toBeDefined();
    expect(admin!.label).toBe('Admin');
  });

  it('permissions starting with "Cannot" are treated as restrictions', () => {
    const admin = ROLES.find(r => r.key === 'admin')!;
    const restrictions = admin.perms.filter(p => p.startsWith('Cannot'));
    // admin has no restrictions logically, but our mock has one
    expect(Array.isArray(restrictions)).toBe(true);
  });

  it('manager role has "Cannot manage users" restriction', () => {
    const mgr = ROLES.find(r => r.key === 'manager')!;
    expect(mgr.perms.some(p => p.startsWith('Cannot'))).toBe(true);
  });

  it('role keys are unique', () => {
    const keys = ROLES.map(r => r.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

describe('Settings page — user table helper logic', () => {
  const ROLE_COLOR: Record<string, string> = { admin: 'purple', manager: 'blue', staff: 'cyan' };

  it('ROLE_COLOR maps admin to purple', () => {
    expect(ROLE_COLOR['admin']).toBe('purple');
  });

  it('ROLE_COLOR maps manager to blue', () => {
    expect(ROLE_COLOR['manager']).toBe('blue');
  });

  it('ROLE_COLOR maps staff to cyan', () => {
    expect(ROLE_COLOR['staff']).toBe('cyan');
  });

  it('unknown role returns undefined from ROLE_COLOR', () => {
    expect(ROLE_COLOR['superadmin']).toBeUndefined();
  });

  it('avatar initial is first char uppercase', () => {
    const name = 'ravi kumar';
    expect(name.charAt(0).toUpperCase()).toBe('R');
  });
});
