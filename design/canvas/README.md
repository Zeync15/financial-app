# Design canvas (copy)

A copy of the "Financial App" design canvas, taken on 24 November 2026 from https://claude.ai/artifact/XpwwrUh4Q2WqcCjoqLmaLp (version 1795509708-5afb). The live canvas stays there and is where designing happens; this folder is a snapshot so the design can be read and compared from the repo.

The canvas follows the live site (https://financial-app-zy.vercel.app) as it looked on 23 November 2026, after release `c4f82ce`, plus the approved designs that are not built yet. The categories (names, order, colours and icons) are the real ones from the live site; every account, amount, transaction and other name on the boards is sample data, and the sidebar shows `you@example.com`. Keep it that way: this repo is public, so real figures never go on the canvas.

**Two pages.** "Design (live app)" is the complete design: the app as it is, plus every approved change, built or not. Once a proposal is approved it is drawn there too. "Proposed changes" keeps each change as a Before board beside an After board, with an orange note per row:

1. Delete dialog redesign (`P-delete-*`): the app's own form style instead of Ant Design's stock confirm; on phone a bottom sheet. Built (`c4f82ce`).
2. Transactions (`P-transactions-*`): money as "+ RM" / "− RM" with 2 decimals, the month picker drawn like the form fields, and an emoji for each category. Built.
3. Dashboard (`P-dashboard-*`, `Dashboard-labels`): the money format, RM instead of MYR on account rows, and new second lines for the account rows. Investments show the symbol with "type · units · gain" underneath; loans "rate type · rate p.a. · months paid"; instalments "RM a month · months paid"; bank accounts and cards keep "type · bank". Built.
4. Loans and Investments (`P-loans-*`, `P-investments-*`): 2 decimals everywhere, and the desktop sidebar's Loans icon becomes the account book from the phone bar. Built.
5. Categories (`P-categories-*`, expense and income tabs): every category shows an emoji that looks like the thing instead of a line icon (🍴 Food & Drinks, 🛍️ Shopping, 🚗 Car, 🧾 Bills & Fees, 🚆 Transport, 🛒 Groceries, 🎬 Entertainment, 🎾 Sports & Hobbies, 💊 Healthcare, ✂️ Beauty, 🎁 Gifts, 🐈‍⬛ Cat, ✈️ Travel, 🏠 Home, 📚 Education, 🏷️ Other; income 💰 Salary, 🎉 Bonus, 👛 Allowance, 🪙 Cash Back, 🏷️ Other, 🎁 Gifts, 📋 Claims, 💵 Extra Income, 🏦 Savings). The car emoji is recoloured to `#383838` and the cat to black. The emoji has no tile behind it; the car and the cat get a thin light outline. Built.
6. New transaction, fewer taps (`P-form-*`, expense, income and transfer rows, plus `P-date-options`): Type, then Account | Amount on one row, Date, Note, then every category as a round emoji with its name underneath (4 a row on phone, 6 on desktop; the picked one gets a green ring). Date is one field that names the day ("Today, 23 Nov") with a pill inside that swaps to Yesterday and back; tapping the field opens the calendar. A transfer has no category. The page does not scroll: only the category grid does, with no scrollbar. On phone it meets the bottom bar as row 8 says. Approved, not built.
7. Category icon picker (`P-picker-*`, `P-insights-*`): the Categories form loses its "Icon (optional)" text box and its Color field and becomes Name, Type, then an emoji picker: about 100 suggested Fluent emoji in 13 groups, chips to filter to one group, and a search over the whole Fluent set (1,595). On phone the form is a full-screen page. The app gives each new category its colour from a fixed set of 12, once, when the category is made. In Insights the spending list shows each category's emoji with a small dot in its slice colour (option B on the `P-insights-*` boards). Approved, not built.
8. Phone form and the bottom bar (`P-bar-*`, `P-size-17-*`): on a phone the full-screen form ran under the bottom bar, so Cancel and Add Transaction ran into it, an empty strip sat above them, and a drag on the button row moved the page. Now the form ends at the top of the bottom bar, which stays on screen; the buttons sit right on the bar with no line above them, 12 px under the category grid; only the grid scrolls, and a drag anywhere else does nothing. The Before board draws the old phone look; the Design page's phone form boards (new, amount keypad, delete) draw the new one. Every full-screen phone form gets this, the Categories form too. Approved 24 November 2026, built.

Not proposed: one form pattern on phone for the other forms (later), Budgets (left as it is), where Delete buttons sit (fine for now).

Switches: `proposed` on `Main`, `Dashboard`, `Categories`, `Investments`, `Loans`, `Nav` and `Confirm` is on by default (rows 1–5 are built); the Before boards of rows 1–5 turn it off to draw the old look. `Dashboard` `labels`, `Main` `quick` (the row 6 form) and `chart` (own, auto, emoji; emoji is row 7's option B), and `Categories` `picker` are on (or `emoji`) by default for the same reason; the Before boards turn them off.

- **It goes stale.** Copy it again after any change to the canvas, and update the date and version above.
- **It is for reading, not viewing.** Each board is the canvas's own source file. Opened from here it will not display properly: the boards need the canvas's runtime, and the images and stylesheets live on the canvas and were not copied.
- **Do not edit these files by hand.** A change made here does not reach the canvas.

`canvas.json` holds the canvas itself: where each board sits, the section titles and the sticky note on how the boards are built.

## How the boards are built

Each screen is one component board that draws every state at both sizes, chosen by props (`size` is `phone` or `desktop`). The other boards are small wrappers that mount it with different props, so a design change to a screen is made once, in its component. `Nav` draws the desktop sidebar and the phone bottom bar for every screen.

| Screen | Component | Its own props | Shows by default |
|---|---|---|---|
| Sign in | `SignIn.dc.html` | `size` | desktop |
| Transactions (the landing page) | `Main.dc.html` | `size`, `tab` (list, insights), `form` (none, new, edit), `txType` (expense, income, transfer), `pad` (amount keypad open), `search` (phone search open), `more` (phone More sheet), `quick`, `chart`, `proposed`, `navbar` (how the open phone form meets the bottom bar: `hidden` covers it, `over` is the old phone look with the bar on top, `above` is row 8) | desktop, the list |
| Dashboard | `Dashboard.dc.html` | `size`, `tab` (accounts, allocation), `form` (none, account, income), `labels`, `proposed` | desktop, accounts |
| Budgets | `Budgets.dc.html` | `size`, `form` (none, new), `empty` (true shows "No budgets yet", as live) | desktop, empty |
| Categories | `Categories.dc.html` | `size`, `tab` (expense, income), `form` (none, new, edit), `picker`, `search` (picker open on a sample search), `proposed` | desktop, expense |
| Investments | `Investments.dc.html` | `size`, `form` (none, new, edit) | desktop |
| Loans and Instalments | `Loans.dc.html` | `kind` (loans, instalments), `size`, `schedule` (first card's schedule open), `form` (none, new, adjust) | desktop, loans |
| Recurring | `Recurring.dc.html` | `size`, `form` (none, new, edit) | desktop |
| Navigation | `Nav.dc.html` | `size`, `active` | desktop sidebar |
| Delete confirmation | `Confirm.dc.html` | `size`, `kind` (transaction, budget, category, instalment, adjustment), `proposed` | the dialog over a dimmed page |
| Dashboard row labels (proposal) | `Dashboard-labels.dc.html` | none | current and proposed second lines side by side |
| App icon | `AppIcon.dc.html` | none | the icon at four sizes |

## Boards

Sizes: iPhone 17, 402 × 874 (the app's phone layout is anything under 768 wide), and desktop 1440 × 900. Phone boards are drawn at iPhone 17 size only, and every one shows the bottom bar, forms included. (`Main`, `Nav` and `Confirm` also take `phoneW` / `phoneH` / `home`, or `w` / `h` / `home`, for another phone; no board uses them.) Wrapper files are named `<Component>-<state>-<size>.dc.html`; a name without `-phone` is the desktop board.

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

Every delete in the app asks through one confirm dialog (`useConfirmDelete` in `src/components/forms/FormKit.tsx`). Before release `c4f82ce` it was Ant Design's stock confirm: 416 wide, a warning icon, the question, "This action cannot be undone.", Cancel and a red Delete (or Remove). Now it is in the app's own form style: a 440 wide panel with 16 px corners, a red bin chip, a title that names the thing ("Delete this transaction?"), a line saying exactly what goes, and the app's pill buttons. On phone it becomes a bottom sheet with full-width Delete and Cancel. The delete boards on the Design page lay `Confirm` over the screen it comes from; the old dialog is on the Proposed changes page's Before boards.

## Images and styles

Every image a board shows is uploaded to the canvas's image store and referenced as a `/_blob/<id>` link:

- the app icon (`public/favicon.svg`),
- the Google logo from `src/components/auth/GoogleButton.tsx`,
- each Ant Design icon the app uses, taken from `@ant-design/icons-svg`,
- the confirm dialog's filled warning icon, already in its colour (`#d89614`),
- the category emoji, and the 102 emoji of the row 7 picker, from Microsoft's Fluent Emoji Flat set (https://github.com/microsoft/fluentui-emoji, MIT licence), the same set the note app uses. The black cat is recoloured from the set's purple-grey to black, with a yellow eye and pink nose, and the car from red to `#383838`.

Two uploaded stylesheets are linked from every board's `<head>`. The first carries the app's tokens and classes from `src/index.css`, plus one `.i-<name>` class per icon, which draws the icon image as a mask so it takes the text colour. The second adds the classes from release `b57ac88`: search in the title row, tappable spending rows, the full-screen phone form and the amount keypad.
