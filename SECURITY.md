# Security policy

Please do not post API keys, OSS credentials, signed URLs, account details,
production logs or private screenshots in GitHub issues or discussions.

If you find a security problem in the open-source Studio code, use a private
security report on GitHub or contact the project maintainer before publishing
details. Include a minimal reproduction, affected version and impact.

The hosted LinoRoute service is a separate production system. Do not assume
that a report about this repository grants access to that service.

Before publishing a fork, scan both the working tree and Git history for
secrets. If a credential has ever been committed, rotate it even if the file
was later removed.
