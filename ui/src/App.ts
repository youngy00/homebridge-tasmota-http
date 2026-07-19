import { request, importDevice } from './api';
import type { UiDevice } from './types';

export function App(): string {
  return `
    <div class="container">

      <h1>Homebridge Tasmota Local</h1>

      <button id="scanButton">
        Scan Network
      </button>

      <hr>

      <div id="results">
        No scan performed.
      </div>

    </div>
  `;
}

function deviceRow(device: UiDevice): HTMLElement {

  const row = document.createElement('div');
  row.className = 'device';

  if (!device.configured) {

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'importCheckbox';
    checkbox.dataset.host = device.host;
    checkbox.dataset.name = device.name;

    row.appendChild(checkbox);
    row.appendChild(document.createTextNode(' '));
  }

  const label = document.createElement('strong');
  label.textContent = device.name;
  row.appendChild(label);

  row.appendChild(document.createElement('br'));
  row.appendChild(document.createTextNode(`IP: ${device.host}`));
  row.appendChild(document.createElement('br'));

  const status = document.createElement('span');
  status.className = 'status';
  status.textContent = `Status: ${device.configured ? 'Configured' : 'Import'}`;
  row.appendChild(status);

  return row;
}

function buildControls(unconfiguredCount: number): HTMLElement {

  const controls = document.createElement('div');
  controls.className = 'controls';

  const selectAll = document.createElement('input');
  selectAll.type = 'checkbox';
  selectAll.id = 'selectAllCheckbox';
  selectAll.disabled = unconfiguredCount === 0;

  const selectAllLabel = document.createElement('label');
  selectAllLabel.htmlFor = 'selectAllCheckbox';
  selectAllLabel.textContent = ' Select all';

  const importButton = document.createElement('button');
  importButton.id = 'importSelectedButton';
  importButton.textContent = 'Import Selected (0)';
  importButton.disabled = true;

  controls.appendChild(selectAll);
  controls.appendChild(selectAllLabel);
  controls.appendChild(importButton);
  controls.appendChild(document.createElement('hr'));

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

    window.homebridge?.toast?.success(
      `Import Selected clicked but ${checkboxes.length} device(s) were checked.`,
      'Debug: click received',
    );

    return;
  }

  window.homebridge?.toast?.success(
    `Import Selected clicked with ${checkboxes.length} device(s) checked.`,
    'Debug: click received',
  );

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
    const statusEl =
      checkbox.closest('.device')?.querySelector<HTMLElement>('.status');

    importButton.textContent = `Importing ${done}/${checkboxes.length}...`;

    try {

      const result = await importDevice(host, name);

      if (statusEl) {
        statusEl.textContent =
          `Status: ${result === 'imported' ? 'Imported' : 'Already configured'}`;
      }

      checkbox.checked = false;
      checkbox.disabled = true;

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
    }
  });

  button.addEventListener('click', async () => {

    results.textContent = 'Scanning...';

    try {

      const devices = await request<UiDevice[]>('/scan');

      if (devices.length === 0) {
        results.textContent = 'No Tasmota devices found.';
        return;
      }

      const unconfiguredCount =
        devices.filter(device => !device.configured).length;

      results.replaceChildren(
        buildControls(unconfiguredCount),
        ...devices.flatMap(device => [
          deviceRow(device),
          document.createElement('hr'),
        ]),
      );

    } catch (error) {

      console.error(error);
      results.textContent = 'Scan failed.';
    }
  });
}
