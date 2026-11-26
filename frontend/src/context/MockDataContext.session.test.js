// Verifies that restored tab sessions initialize the shared mock identity consistently.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MockDataProvider, useMockData } from './MockDataContext';
import { hasAuthenticatedEmployee, useLoginSession } from '../utils/session';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function IdentityProbe() {
  const { actorId, viewer } = useMockData();
  const session = useLoginSession();
  return (
    <output data-testid="identity">
      {JSON.stringify({ employeeId: session?.employeeId || null, guest: Boolean(session?.guest), actorId, viewerId: viewer?.id || null })}
    </output>
  );x
}

describe('MockDataProvider session identity restoration', () => {
  let container;
  let root;

  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  test.each(['emp-009', 'emp-001', 'emp-008'])(
    'restores tab session identity for %s consistently',
    (employeeId) => {
      window.sessionStorage.setItem('mecha.session', JSON.stringify({ employeeId }));

      act(() => {
        root.render(
          <MockDataProvider>
            <IdentityProbe />
          </MockDataProvider>,
        );
      });

      const identity = JSON.parse(container.querySelector('[data-testid="identity"]').textContent);
      expect(identity).toEqual({ employeeId, guest: false, actorId: employeeId, viewerId: employeeId });
    },
  );

  test('keeps emp-009 identity after remount when Remember Device and tab session are both present', () => {
    const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
    window.sessionStorage.setItem('mecha.session', JSON.stringify({ employeeId: 'emp-009' }));
    window.localStorage.setItem('mecha.remembered', JSON.stringify({ employeeId: 'emp-009', expiresAt }));

    act(() => {
      root.render(
        <MockDataProvider>
          <IdentityProbe />
        </MockDataProvider>,
      );
    });

    const identity = JSON.parse(container.querySelector('[data-testid="identity"]').textContent);
    expect(identity).toEqual({ employeeId: 'emp-009', guest: false, actorId: 'emp-009', viewerId: 'emp-009' });
    expect(JSON.parse(window.localStorage.getItem('mecha.remembered')).expiresAt).toBe(expiresAt);

    act(() => root.unmount());
    container.innerHTML = '';
    root = createRoot(container);
    act(() => {
      root.render(
        <MockDataProvider>
          <IdentityProbe />
        </MockDataProvider>,
      );
    });
    expect(JSON.parse(container.querySelector('[data-testid="identity"]').textContent)).toEqual({
      employeeId: 'emp-009', guest: false, actorId: 'emp-009', viewerId: 'emp-009',
    });
  });

  test('keeps guest session without an authenticated viewer', () => {
    window.sessionStorage.setItem('mecha.session', JSON.stringify({ guest: true }));

    act(() => {
      root.render(
        <MockDataProvider>
          <IdentityProbe />
        </MockDataProvider>,
      );
    });

    const identity = JSON.parse(container.querySelector('[data-testid="identity"]').textContent);
    expect(identity).toEqual({ employeeId: null, guest: true, actorId: 'emp-001', viewerId: null });
  });

  test('only an employee session is treated as authenticated presentation state', () => {
    expect(hasAuthenticatedEmployee(null)).toBe(false);
    expect(hasAuthenticatedEmployee({ guest: true })).toBe(false);
    expect(hasAuthenticatedEmployee({ employeeId: 'emp-009' })).toBe(true);
  });
});
