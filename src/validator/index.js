
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
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN)
  let { payload, eventName } = github.context
  const { pull_request: pr } = payload


  const loadCommitsForPullRequest = (commitsUrl) => {
    return octokit.request({ method: "GET", url: commitsUrl })
  }

  const checkCommitsGpgVerification = (commits) => {
    return commits
      .filter(({ commit }) => !commit.verification.verified)
      .map((commit) => commit.sha)
  }

  const checkCommitsSignOff = (commits) => {
    const re = /(Signed-off-by:\s*)(.+)<(.+@.+)>/

    return commits.filter((commit) => {
      const { commit: commitDetail } = commit
      const match = re.exec(commitDetail.message)
      if (!match) return commit


      const [_full, _sign, author, email] = match

      if (commitDetail.author.name !== author.trim() || commitDetail.author.email !== email)
        return commit

      return null

    }).map(commit => commit.sha)

  }


  const createFailedCheckVerification = (...failedCommits) => {

    const [notSigned, notVerified] = failedCommits

    const message = `${notSigned.length ? `\n Some commits are incorrectly signed off :
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

  const start = async () => {
    const shouldVerifyGpg = process.env.VALIDATE_GPG || false
    let notSignedCommits = []
    let notGpgVerifiedCommits = []

    const { data: prCommits } = await loadCommitsForPullRequest(pr.commits_url)

    notSignedCommits = checkCommitsSignOff(prCommits)

    if (shouldVerifyGpg === 'true')
      notGpgVerifiedCommits = checkCommitsGpgVerification(prCommits)

    if (notSignedCommits.length || notGpgVerifiedCommits.length)
      return createFailedCheckVerification(notSignedCommits, notGpgVerifiedCommits)

    return createSuccessCheckVerification()

  }

  if (eventName === 'pull_request') {
    start()
  } else {
    createCheckErrorForFailedAction()
  }


}

module.exports = validateCommitSignatures