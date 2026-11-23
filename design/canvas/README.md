# Design canvas (copy)

A copy of the "Financial App" design canvas, taken on 23 November 2026 from https://claude.ai/artifact/XpwwrUh4Q2WqcCjoqLmaLp (version 1795421638-f8d9). The live canvas stays there and is where designing happens; this folder is a snapshot so the design can be read and compared from the repo.

The canvas follows the live site (https://financial-app-sooty.vercel.app, release `b57ac88`) as it looked on 23 November 2026. The layouts are the live site's. The categories (names, order, colours and icons) are the real ones from the live site; every account, amount, transaction and other name on the boards is sample data, and the sidebar shows `you@example.com`. Keep it that way: this repo is public, so real figures never go on the canvas.

**Two pages.** "Design (live app)" shows the app as it is today. "Proposed changes" shows the changes proposed on 23 November 2026, not built yet, each as a Before board (live) beside an After board (proposed), with an orange note per row:

1. Delete dialog redesign (`P-delete-*`): the app's own form style instead of Ant Design's stock confirm; on phone a bottom sheet.
2. Transactions (`P-transactions-*`): money as "+ RM" / "− RM" with 2 decimals, the month picker drawn like the form fields, and an emoji for each category (as on Categories).
3. Dashboard (`P-dashboard-*`, `Dashboard-labels`): the money format, RM instead of MYR on account rows, and new second lines for the account rows, approved 23 November 2026. Investments show the symbol with "type · units · gain" underneath; loans "rate type · rate p.a. · months paid"; instalments "RM a month · months paid"; bank accounts and cards keep "type · bank".
4. Loans and Investments (`P-loans-*`, `P-investments-*`): 2 decimals everywhere, and the desktop sidebar's Loans icon becomes the account book from the phone bar.
5. Categories (`P-categories-*`, expense and income tabs): every category shows an emoji that looks like the thing instead of a line icon (🍽️ Food & Drinks, 🛍️ Shopping, 🚗 Car, 🧾 Bills & Fees, 🚆 Transport, 🛒 Groceries, 🎬 Entertainment, 🎾 Sports & Hobbies, 💊 Healthcare, ✂️ Beauty, 🎁 Gifts, 🐈‍⬛ Cat, ✈️ Travel, 🏠 Home, 📚 Education, 🏷️ Other; income 💰 Salary, 🎉 Bonus, 👛 Allowance, 🪙 Cash Back, 🏷️ Other, 🎁 Gifts, 📋 Claims, 💵 Extra Income, 🏦 Savings). The car emoji is recoloured to `#383838` and the cat to black, and Car's category colour becomes `#383838` (live `#9aa3ad`). The emoji has no tile background behind it; the car and the cat get a thin light outline so they show on the dark panel.

Not proposed: one form pattern on phone (later), Budgets (left as it is), where Delete buttons sit (fine for now).

The changed components (`Main`, `Dashboard`, `Categories`, `Investments`, `Loans`, `Nav`, `Confirm`) take a `proposed` prop: off by default, which draws the live app; the After boards turn it on. When a proposal is built, make its new look the default and drop the switch.

- **It goes stale.** Copy it again after any change to the canvas, and update the date and version above.
- **It is for reading, not viewing.** Each board is the canvas's own source file. Opened from here it will not display properly: the boards need the canvas's runtime, and the images and stylesheets live on the canvas and were not copied.
- **Do not edit these files by hand.** A change made here does not reach the canvas.

`canvas.json` holds the canvas itself: where each board sits, the section titles and the sticky note on how the boards are built.

## How the boards are built

Each screen is one component board that draws every state at both sizes, chosen by props (`size` is `phone` or `desktop`). The other boards are small wrappers that mount it with different props, so a design change to a screen is made once, in its component. `Nav` draws the desktop sidebar and the phone bottom bar for every screen.

| Screen | Component | Its own props | Shows by default |
|---|---|---|---|
| Sign in | `SignIn.dc.html` | `size` | desktop |
| Transactions (the landing page) | `Main.dc.html` | `size`, `tab` (list, insights), `form` (none, new, edit), `pad` (amount keypad open), `search` (phone search open), `more` (phone More sheet) | desktop, the list |
| Dashboard | `Dashboard.dc.html` | `size`, `tab` (accounts, allocation), `form` (none, account, income) | desktop, accounts |
| Budgets | `Budgets.dc.html` | `size`, `form` (none, new), `empty` (true shows "No budgets yet", as live) | desktop, empty |
| Categories | `Categories.dc.html` | `size`, `tab` (expense, income), `form` (none, new, edit) | desktop, expense |
| Investments | `Investments.dc.html` | `size`, `form` (none, new, edit) | desktop |
| Loans and Instalments | `Loans.dc.html` | `kind` (loans, instalments), `size`, `schedule` (first card's schedule open), `form` (none, new, adjust) | desktop, loans |
| Recurring | `Recurring.dc.html` | `size`, `form` (none, new, edit) | desktop |
| Navigation | `Nav.dc.html` | `size`, `active` | desktop sidebar |
| Delete confirmation | `Confirm.dc.html` | `size`, `kind` (transaction, budget, category, instalment, adjustment), `proposed` | the live dialog over a dimmed page |
| Dashboard row labels (proposal) | `Dashboard-labels.dc.html` | none | current and proposed second lines side by side |
| App icon | `AppIcon.dc.html` | none | the icon at four sizes |

## Boards

Sizes: iPhone 402 × 874 (the app's phone layout is anything under 768 wide) and desktop 1440 × 900. Wrapper files are named `<Component>-<state>-<size>.dc.html`; a name without `-phone` is the desktop board.

| Screen | iPhone | Desktop |
|---|---|---|
| Sign in | `SignIn-phone` | `SignIn` |
| Transactions, the list | `Main-phone` | `Main` |
| Transactions, insights | `Main-insights-phone` | (shown beside the list on desktop) |
| Transactions, search open | `Main-search-phone` | (always shown on desktop) |
| New transaction | `Main-new-phone` (full-screen page) | `Main-new` |
| New transaction, amount keypad | `Main-amount-phone` | `Main-amount` |
| Edit transaction | | `Main-edit` |
| More sheet | `Main-more-phone` | |
| Dashboard, accounts | `Dashboard-phone` | `Dashboard` |
| Dashboard, allocation | `Dashboard-allocation-phone` | `Dashboard-allocation` |
| New account | | `Dashboard-account` |
| Budgets | `Budgets-phone` | `Budgets` |
| Categories | `Categories-phone` | `Categories` |
| New category | | `Categories-new` |
| Investments | `Investments-phone` | `Investments` |
| Add holding | | `Investments-new` |
| Loans | `Loans-phone` | `Loans` |
| Loans, schedule open | | `Loans-schedule` |
| Loan adjustments | | `Loans-adjust` |
| Instalments | `Instalments-phone` | `Instalments` |
| Recurring | `Recurring-phone` | `Recurring` |
| Delete from any edit form (drawn for a transaction) | `Main-delete-phone` | `Main-delete` |
| Delete a budget | | `Budgets-delete` |
| Delete a category | | `Categories-delete` |
| Delete an instalment | | `Instalments-delete` |
| Remove a loan adjustment | | `Loans-adjust-remove` |

Every delete in the app asks through one confirm dialog (`useConfirmDelete` in `src/components/forms/FormKit.tsx`). Live, it is Ant Design's stock confirm: 416 wide, a warning icon, the question, "This action cannot be undone.", Cancel and a red Delete (or Remove). The canvas proposes a redesign in the app's own form style: a 440 wide panel with 16 px corners, a red bin chip, a title that names the thing ("Delete this transaction?"), a line saying exactly what goes, and the app's pill buttons. On phone it becomes a bottom sheet with full-width Delete and Cancel. The delete boards on the Design page lay the live `Confirm` over the screen it comes from; the redesign is on the Proposed changes page.

## Images and styles

Every image a board shows is uploaded to the canvas's image store and referenced as a `/_blob/<id>` link:

- the app icon (`public/favicon.svg`),
- the Google logo from `src/components/auth/GoogleButton.tsx`,
- each Ant Design icon the app uses, taken from `@ant-design/icons-svg`,
- the confirm dialog's filled warning icon, already in its colour (`#d89614`),
- the category emoji on the Proposed changes page, from Microsoft's Fluent Emoji Flat set (https://github.com/microsoft/fluentui-emoji, MIT licence), the same set the note app uses. The black cat is recoloured from the set's purple-grey to black, with a yellow eye and pink nose, and the car from red to `#383838`.

Two uploaded stylesheets are linked from every board's `<head>`. The first carries the app's tokens and classes from `src/index.css`, plus one `.i-<name>` class per icon, which draws the icon image as a mask so it takes the text colour. The second adds the classes from release `b57ac88`: search in the title row, tappable spending rows, the full-screen phone form and the amount keypad.
