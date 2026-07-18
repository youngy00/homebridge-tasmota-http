import { request } from './api';
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

      results.innerHTML = devices.map(device => `
        <div class="device">
          <strong>${device.name}</strong><br>
          IP: ${device.host}<br>
          Status: ${device.configured ? 'Configured' : 'Import'}
          ${
            !device.configured
              ? `<br><button class="importButton" data-host="${device.host}">
                   Import
                 </button>`
              : ''
          }
        </div>
        <hr>
      `).join('');

      document.querySelectorAll<HTMLButtonElement>('.importButton')
        .forEach(button => {

          button.addEventListener('click', async () => {

            const host = button.dataset.host!;

            button.disabled = true;
            button.textContent = 'Importing...';

            try {

              await request('/import', { host });

              button.textContent = 'Imported';

            } catch (error) {

              console.error(error);

              button.disabled = false;
              button.textContent = 'Import';

            }

          });

        });

    } catch (error) {

      console.error(error);
      results.textContent = 'Scan failed.';

    }

  });

}