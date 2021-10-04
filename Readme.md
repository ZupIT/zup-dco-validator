## How to use this action

This action helps you check pull request commits signatures for DCO (Developer Certificate of Origin) and GPG verification

For default, GPG validation is disabled but you can easily change that using an environment variable:

[Learn more about GPG verification for your commits](https://docs.github.com/pt/github/authenticating-to-github/managing-commit-signature-verification/about-commit-signature-verification)

e.g:
```sh
name: DCO GPG VALIDATOR
on:
  pull_request:
    types: [opened, synchronize]
    branches: [main]

jobs:
  dco-gpg-validator:
    runs-on: ubuntu-latest
    steps:
      - uses: ZupIT/zup-dco-validator@v1.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          VALIDATE_GPG: false
```

### Skipping authors

If you have a list of authors or automated tools that push into your code without the need for validation you can skip them with another environment variable.

Each author should be added to the ``SKIP_AUTHORS`` variable with a comma separator between them
e.g: SKIP_AUTHORS: "Author A,Author B"


## Contributing

If you have suggestions for how dco-validator could be improved, or want to report a bug, open an issue! We'd love all and any contributions.