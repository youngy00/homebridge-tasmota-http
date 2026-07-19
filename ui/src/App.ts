import { request, importDevice, removeDevice } from './api';
import type { UiDevice } from './types';

export function App(): string {
  return `
    <div class="container">

      <h1>Homebridge Tasmota Local</h1>

      <button id="scanButton">
        Scan Network
      </button>

      <div id="results">
        <p class="empty">No scan performed.</p>
      </div>

    </div>
  `;
}

function statusBadge(configured: boolean): HTMLElement {

  const status = document.createElement('span');
  status.className = `status ${configured ? 'configured' : 'pending'}`;
  status.textContent = configured ? '✓ Configured' : 'Available to import';

  return status;
}

function deviceInfo(device: UiDevice): HTMLElement {

  const info = document.createElement('div');
  info.className = 'device-info';

  const name = document.createElement('span');
  name.className = 'device-name';
  name.textContent = device.name;

  const ip = document.createElement('span');
  ip.className = 'device-ip';
  ip.textContent = device.host;

  info.appendChild(name);
  info.appendChild(ip);
  info.appendChild(statusBadge(device.configured));

  return info;
}

function deviceRow(device: UiDevice): HTMLElement {

  if (device.configured) {

    const row = document.createElement('div');
    row.className = 'device configured-row';
    row.appendChild(deviceInfo(device));

    const removeButton = document.createElement('button');
    removeButton.className = 'removeButton';
    removeButton.textContent = 'Remove';
    removeButton.dataset.host = device.host;
    removeButton.dataset.name = device.name;

    row.appendChild(removeButton);

    return row;
  }

  // Unconfigured rows are a <label> so tapping anywhere on the card toggles
  // the checkbox, not just the small checkbox hitbox itself.
  const row = document.createElement('label');
  row.className = 'device selectable';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'importCheckbox';
  checkbox.dataset.host = device.host;
  checkbox.dataset.name = device.name;

  row.appendChild(checkbox);
  row.appendChild(deviceInfo(device));

  return row;
}

function buildControls(unconfiguredCount: number): HTMLElement {

  const controls = document.createElement('div');
  controls.className = 'controls';

  const selectAllWrapper = document.createElement('label');
  selectAllWrapper.className = 'select-all';

  const selectAll = document.createElement('input');
  selectAll.type = 'checkbox';
  selectAll.id = 'selectAllCheckbox';
  selectAll.disabled = unconfiguredCount === 0;

  const selectAllText = document.createElement('span');
  selectAllText.textContent = 'Select all';

  selectAllWrapper.appendChild(selectAll);
  selectAllWrapper.appendChild(selectAllText);

  const importButton = document.createElement('button');
  importButton.id = 'importSelectedButton';
  importButton.className = 'primary';
  importButton.textContent = 'Import Selected (0)';
  importButton.disabled = true;

  controls.appendChild(selectAllWrapper);
  controls.appendChild(importButton);

  return controls;
}

function importCheckboxes(results: HTMLElement): HTMLInputElement[] {
  return Array.from(
    results.querySelectorAll<HTMLInputElement>('.importCheckbox:not(:disabled)'),
  );
}

function updateControls(results: HTMLElement): void {

  const checkboxes = importCheckboxes(results);
  const checked = checkboxes.filter(checkbox => checkbox.checked);

  const importButton =
    results.querySelector<HTMLButtonElement>('#importSelectedButton');

  if (importButton) {
    importButton.textContent = `Import Selected (${checked.length})`;
    importButton.disabled = checked.length === 0;
  }

  const selectAll =
    results.querySelector<HTMLInputElement>('#selectAllCheckbox');

  if (selectAll) {
    selectAll.checked =
      checkboxes.length > 0 && checked.length === checkboxes.length;
    selectAll.indeterminate =
      checked.length > 0 && checked.length < checkboxes.length;
  }
}

async function importSelected(results: HTMLElement): Promise<void> {

  const importButton =
    results.querySelector<HTMLButtonElement>('#importSelectedButton');

  const checkboxes = importCheckboxes(results).filter(
    checkbox => checkbox.checked,
  );

  if (!importButton || checkboxes.length === 0) {
    return;
  }

  const selectAll =
    results.querySelector<HTMLInputElement>('#selectAllCheckbox');

  importButton.disabled = true;

  if (selectAll) {
    selectAll.disabled = true;
  }

  let done = 0;

  for (const checkbox of checkboxes) {

    const host = checkbox.dataset.host ?? '';
    const name = checkbox.dataset.name ?? '';
    const row = checkbox.closest('.device');
    const statusEl = row?.querySelector<HTMLElement>('.status');

    importButton.textContent = `Importing ${done}/${checkboxes.length}...`;

    try {

      const result = await importDevice(host, name);

      if (statusEl) {
        statusEl.className = 'status configured';
        statusEl.textContent =
          result === 'imported' ? '✓ Imported' : '✓ Already configured';
      }

      row?.classList.remove('selectable');
      checkbox.checked = false;
      checkbox.disabled = true;
      checkbox.hidden = true;

    } catch (error) {

      console.error(error);

      window.homebridge?.toast?.error(
        error instanceof Error ? error.message : String(error),
        `Import failed: ${name}`,
      );

    } finally {
      done++;
    }
  }

  if (selectAll) {
    selectAll.disabled = importCheckboxes(results).length === 0;
  }

  updateControls(results);
}

async function handleRemove(
  button: HTMLButtonElement,
  results: HTMLElement,
): Promise<void> {

  const host = button.dataset.host ?? '';
  const name = button.dataset.name ?? '';

  const confirmed = window.confirm(
    `Remove ${name} (${host})? It will disappear from HomeKit after the next Homebridge restart.`,
  );

  if (!confirmed) {
    return;
  }

  button.disabled = true;
  button.textContent = 'Removing...';

  try {

    await removeDevice(host);

    const row = button.closest('.device');

    row?.replaceWith(
      deviceRow({ name, host, configured: false }),
    );

    updateControls(results);

  } catch (error) {

    console.error(error);

    button.disabled = false;
    button.textContent = 'Remove';

    window.homebridge?.toast?.error(
      error instanceof Error ? error.message : String(error),
      `Remove failed: ${name}`,
    );
  }
}

export function initialize(): void {

  const button = document.getElementById('scanButton') as HTMLButtonElement;
  const results = document.getElementById('results') as HTMLDivElement;

  results.addEventListener('change', (event) => {

    const target = event.target as HTMLElement;

    if (target.id === 'selectAllCheckbox') {

      const checked = (target as HTMLInputElement).checked;

      importCheckboxes(results).forEach(checkbox => {
        checkbox.checked = checked;
      });

      updateControls(results);
      return;
    }

    if (target.classList.contains('importCheckbox')) {
      updateControls(results);
    }
  });

  results.addEventListener('click', (event) => {

    const target = event.target as HTMLElement;

    if (target.id === 'importSelectedButton') {
      importSelected(results);
      return;
    }

    if (target.classList.contains('removeButton')) {
      handleRemove(target as HTMLButtonElement, results);
    }
  });

  button.addEventListener('click', async () => {

    results.replaceChildren();
    results.innerHTML = '<p class="empty">Scanning...</p>';

    try {

      const devices = await request<UiDevice[]>('/scan');

      if (devices.length === 0) {
        results.innerHTML = '<p class="empty">No Tasmota devices found.</p>';
        return;
      }

      const unconfiguredCount =
        devices.filter(device => !device.configured).length;

      const sorted = [...devices].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );

      const list = document.createElement('div');
      list.className = 'device-list';
      sorted.forEach(device => list.appendChild(deviceRow(device)));

      results.replaceChildren(
        buildControls(unconfiguredCount),
        list,
      );

    } catch (error) {

      console.error(error);
      results.innerHTML = '<p class="empty">Scan failed.</p>';
    }
  });
}
