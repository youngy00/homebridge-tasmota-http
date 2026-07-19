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

  const label = document.createElement('strong');
  label.textContent = device.name;
  row.appendChild(label);

  row.appendChild(document.createElement('br'));
  row.appendChild(document.createTextNode(`IP: ${device.host}`));
  row.appendChild(document.createElement('br'));
  row.appendChild(document.createTextNode(
    `Status: ${device.configured ? 'Configured' : 'Import'}`,
  ));

  if (!device.configured) {

    row.appendChild(document.createElement('br'));

    const importButton = document.createElement('button');
    importButton.className = 'importButton';
    importButton.textContent = 'Import';

    importButton.addEventListener('click', async () => {

      importButton.disabled = true;
      importButton.textContent = 'Importing...';

      try {

        const result = await importDevice(device.host, device.name);

        importButton.textContent =
          result === 'imported' ? 'Imported' : 'Already configured';

      } catch (error) {

        console.error(error);

        importButton.disabled = false;
        importButton.textContent = 'Import';

        window.homebridge?.toast?.error(
          error instanceof Error ? error.message : String(error),
          'Import failed',
        );
      }
    });

    row.appendChild(importButton);
  }

  return row;
}

export function initialize(): void {

  const button = document.getElementById('scanButton') as HTMLButtonElement;
  const results = document.getElementById('results') as HTMLDivElement;

  button.addEventListener('click', async () => {

    results.textContent = 'Scanning...';

    try {

      const devices = await request<UiDevice[]>('/scan');

      if (devices.length === 0) {
        results.textContent = 'No Tasmota devices found.';
        return;
      }

      results.replaceChildren(
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
