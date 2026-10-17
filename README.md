# Stitch Money+ functional front-end prototype

This folder is a runnable, static front-end prototype based on the supplied concept site. Open `index.html` or `demo.html` in a browser. No build step or server is required.

## Working interactions

- Estimate the displayed bank, card, and Pay Later costs as the amount changes.
- Select a route, save mock payment details, link a mock bank, and run a simulated payment.
- Update the mock balance and transaction history after a successful simulated purchase.
- Select Free, Plus, or Premium and keep the selection after a reload.
- Keep demo balance, selected plan, mock-link flags, and simulated transactions in browser `localStorage`.
- Use **Reset demo data** on the transaction history panel to clear the local demo state.

## Safety and scope

This is a browser-only demonstration. It does not connect to a bank, payment processor, account service, or backend. The payment and bank forms only check that fields are filled; entered details are not transmitted or saved. Never enter real payment or banking information. Only non-sensitive demo state is persisted locally. Data is specific to the browser and device, and can be cleared with the reset button or by clearing site storage.

The pricing, fees, rewards, uptime, support details, and product claims are illustrative assumptions and should be replaced with verified product data before any public or commercial use. A production app needs a secure backend, authentication, payment provider integration, server-side validation, and appropriate privacy/security review.
