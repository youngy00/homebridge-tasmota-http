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