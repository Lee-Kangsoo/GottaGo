# Private Data Policy

This repository may be public, but the full toilet CSV assets should not be treated as public source code.

## What Counts As Private Here

The following files are operating assets and should stay out of the public repository:

- `data/private/korea_public_toilet.csv`
- `data/private/korea_public_toilet.naver-geocoded.csv`
- `data/private/korea_public_toilet.naver-geocode-cache.csv`

The same rule applies if those files are stored somewhere else such as a private bucket or a private repo.

## Why

- the raw public source still has collection and operational value for this product
- the geocoded and cached versions are enriched internal assets, not just boilerplate inputs
- once large data files land in public git history, removing future copies does not fully undo exposure

## Public Repo Rule

Public repository content should be limited to:

- application code
- DB schema
- import scripts
- setup docs
- small redacted samples if needed

Public repository content should not include:

- full production CSVs
- geocoding cache outputs
- environment files
- secrets or internal operational notes

## Recommended Local Layout

```text
data/
  private/
    korea_public_toilet.csv
    korea_public_toilet.naver-geocoded.csv
    korea_public_toilet.naver-geocode-cache.csv
```

The import and geocoding scripts now prefer `data/private/` by default, but still accept explicit file paths.

## Immediate Remediation

1. Stop tracking the CSV files in git.
2. Keep the local working copies in `data/private/` or another ignored location.
3. Commit the removal from the repository tree.
4. If the files were already pushed publicly, decide whether to rewrite remote history.

## Important Limitation

Removing files in a new commit reduces future exposure, but it does not erase earlier public commits by itself.
If the data has already been pushed to a public remote, history rewrite is the next step.
