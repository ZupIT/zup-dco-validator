
/*
 * Copyright 2020 ZUP IT SERVICOS EM TECNOLOGIA E INOVACAO SA
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const github = require('@actions/github');
const core = require('@actions/core');

const validateCommitSignatures = () => {
  const authorsToSkip = process.env.SKIP_AUTHORS || " "
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN)

  const loadCommitsForPullRequest = (commitsUrl) => {
    return octokit.request({ method: "GET", url: commitsUrl })
  }

  const checkCommitsGpgVerification = (commits) => {
    return commits
      .filter(({ author }) => !authorsToSkip.split(',').includes(author.name))
      .filter((commit) => !commit.verification.verified)
      .map((commit) => commit.sha)
  }

  const checkCommitsSignOff = (commits) => {
    const re = /(Signed-off-by:\s*)(.+)<(.+@.+)>/

    return commits
      .filter(({ author }) => !authorsToSkip.split(',').includes(author.name))
      .filter(({ parents }) => parents && !(parents.length === 2))
      .flatMap(({ author, message, sha }) => {
        const match = re.exec(message)
        if (!match) return [sha]

        const [_full, _sign, signedAuthor, signedEmail] = match

        if (author.name !== signedAuthor.trim() || author.email !== signedEmail)
          return [sha]

        return []
      })
  }


  const createFailedCheckVerification = (...failedCommits) => {

    const [notSigned, notVerified] = failedCommits

    const message = `${notSigned.length ? `\nSome commits are incorrectly signed off :
      ${notSigned.map(commitSha => `\n ${commitSha}`).join(' ')}` : ''}
    ${notVerified.length ? `\nGPG Verification not found for some commits :
      ${notVerified.map(commitSha => `\n ${commitSha}`).join(' ')}` : ''}
    `
    core.setFailed(message)

  }

  const createSuccessCheckVerification = () => {
    core.info("Congratulations!!! All your commits are signed")
  }

  const createCheckErrorForFailedAction = () => {
    core.setFailed('Validation error. Please, make sure you are using the correct configuration for this action. https://github.com/ZupIT/zup-dco-validator')
  }

  const filterCommitsForEvent = async (eventName) => {
    const { payload } = github.context

    if (eventName === 'pull_request') {
      const { pull_request: pr } = payload
      const { data: prCommits } = await loadCommitsForPullRequest(pr.commits_url)
      return prCommits.map(item => ({ ...item.commit, sha: item.sha, parents: item.parents })) // github API return an object with the 'commit' key
    }

    if (eventName === 'push') {
      return payload.commits.map(item => ({ ...item, sha: item.id, parents: [] })) // Push payloads are simpler than pull request
    }

    return

  }

  const start = async () => {
    const shouldVerifyGpg = process.env.VALIDATE_GPG || false
    const { eventName } = github.context

    let notSignedCommits = []
    let notGpgVerifiedCommits = []
    let commits = await filterCommitsForEvent(eventName)

    if (!commits) return createCheckErrorForFailedAction()

    notSignedCommits = checkCommitsSignOff(commits)

    if (shouldVerifyGpg === 'true' && eventName === "pull_request")
      notGpgVerifiedCommits = checkCommitsGpgVerification(commits)

    if (notSignedCommits.length || notGpgVerifiedCommits.length)
      return createFailedCheckVerification(notSignedCommits, notGpgVerifiedCommits)

    return createSuccessCheckVerification()

  }

  start()


}

module.exports = validateCommitSignatures