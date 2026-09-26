# Security Policy

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Email **info@molecare.co.uk**, or open a private
[security advisory](https://github.com/MoleCare/react-photo-compare/security/advisories/new)
on this repository, with:

- what the issue is and where in the code it lives
- how to reproduce it
- what an attacker could do with it

You should get an acknowledgement within **3 working days**. We will tell you
when a fix is released and credit you in the release notes, unless you would
rather we did not.

## Supported versions

Security fixes go into the latest release.

## Scope

In scope:

- this package's code: anything it renders from the props it is given, and
  the event listeners it adds to the page
- dependency vulnerabilities that are reachable from this code (it has none
  at run time besides React)

Out of scope here (but still worth telling us about at the same address): the
MoleCare apps and API.

## Data safety

The package shows the image URLs the host app gives it and never sends
anything over the network. Never include a real photo of a person, or any
health data, in a bug report.
