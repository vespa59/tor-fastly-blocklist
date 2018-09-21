# tor-fastly-blacklist

Synchronizes a Fastly ACL with a current Tor exit node list from `https://check.torproject.org/cgi-bin/TorBulkExitList.py?ip=151.101.1.57`. Patches to the ACL are done in batches of 500 so as to not run afoul of the Fastly API's batch update limit. 

## Prerequisites

* [node.js](https://nodejs.org/)
* [npm](https://www.nmpjs.com/)
* A Fastly service with an ACL created on it. You'll need the IDs of both service and ACL.
* A Fastly token with `engineer` privileges on the Fastly service.

## Installing

1. Clone this repo or download all the files to a directory.
2. `npm install`.
3. Edit `config.js` and fill out the fields with your values.

## Usage

`node index.js`

## What happens when you run this

The script grabs the Tor exit node list and gets a list of all the current entries on the Fastly ACL. It compares them and creates a list of changes, splits the list of changes in to batches, and then sends those changes via the Fastly API.