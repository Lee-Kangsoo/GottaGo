# Public History Remediation

The CSV data files were already committed in public git history.

Current confirmed remote:

- `origin`: `https://github.com/Lee-Kangsoo/GottaGo.git`

Current confirmed commit containing data addition:

- `21c96ba` on `main`

## What Has Been Done Locally

- added ignore rules for the CSV assets
- updated docs to treat these files as private operating assets
- prepared the repo for removing those files from normal tracking

## What Still Matters

A normal "delete files in the next commit" action only fixes the repository head.
It does not remove the data from old public commits that were already pushed.

## Safe Response Options

### Option 1: Make The Whole Repo Private

Fastest and safest if open-source distribution is not required.

### Option 2: Keep Code Public, Rewrite History

Use this if code should stay public but data should be removed from every public commit.

High-level steps:

1. remove tracked data files from the current tree
2. rewrite history to purge the CSV paths from all commits
3. force-push the cleaned history
4. verify GitHub no longer exposes the old blobs

## Files To Purge

- `korea_public_toilet.csv`
- `korea_public_toilet.naver-geocoded.csv`
- `korea_public_toilet.naver-geocode-cache.csv`

## Note

Even after a history rewrite, copies may still exist in forks, clones, caches, or downloads made before cleanup.
History rewrite is still worth doing because it removes the files from the main public repository lineage.
