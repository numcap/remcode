# ReMCode privacy policy

_Last updated: October 31, 2026_

ReMCode is a browser extension for Chrome and Firefox that helps you remember the coding problems you solve on LeetCode and NeetCode. This policy explains what data it handles, where that data goes, and how you can remove it.

**In short:** ReMCode has no server, no account and no analytics. Your data stays in your browser. It leaves your browser only if you turn on GitHub sync, and then it goes only to a GitHub repository you own.

## What ReMCode handles

ReMCode stores the following in your browser's extension storage (`storage.local`):

- **Problems you save:** the title, number, difficulty, topics, link and problem statement.
- **Your code:** up to five of your accepted submissions per problem, with their language, runtime and memory usage.
- **Your notes:** the "key insight" for each problem, and anything you write in the scratch pad during a review.
- **Review history:** when you solved or reviewed each problem, how you rated it, and when it's next due.
- **Settings:** your target retention, daily review limit, theme and the other options on the Settings page.
- **GitHub sync settings (only if you turn sync on):** the repository name and the personal access token you enter.

To notice an accepted submission, ReMCode reads the responses that LeetCode's and NeetCode's judges send to your browser on problem pages. It only reads them and never changes any request or response. It doesn't look at other pages or record your browsing history.

## Where your data goes

- **Nowhere by default.** Everything above stays in your browser. ReMCode doesn't have a server, and the developer never receives your data.
- **LeetCode and NeetCode.** ReMCode asks these sites for a problem's details, such as its title, difficulty, topics and statement. On a problem page it does this with your existing session, the same way the site itself does. When you add a problem by number or link from the dashboard, the request is made without your cookies. Each site's own privacy policy covers these requests.
- **GitHub, only if you turn on sync.** ReMCode then reads and writes one file, `remcode.json`, in the repository you choose, using the token you provide. That file contains your deck and settings, but not your token. GitHub's privacy policy covers data stored there.

ReMCode contains no analytics, tracking, advertising or third-party scripts. It doesn't sell your data, share it with anyone, or use it for anything other than scheduling your reviews.

## Your GitHub token

The token is stored unencrypted in your browser's extension storage, because extensions have no secure place to keep it. It's sent only to `api.github.com`, and it's never included in **Export JSON** or written to the synced file. Give it access to only your sync repository, as the setup steps recommend. You can disconnect sync at any time on the Settings page, which removes the token from the browser.

## Your control over your data

- **See or back up:** use **Export JSON** on the Settings page to save a full copy of your deck.
- **Delete a problem:** use **Delete** on its card page.
- **Delete everything:** uninstall the extension. The browser removes all of ReMCode's stored data.
- **Synced data:** delete `remcode.json` or the whole repository on GitHub.

## Children

ReMCode isn't aimed at children and doesn't knowingly collect information about anyone.

## Changes to this policy

Any change to this policy will be made in this file, and the date at the top will be updated. You can see every past version in the repository's history.

## Contact

Questions or concerns: open an issue at <https://github.com/numcap/remcode/issues>.
