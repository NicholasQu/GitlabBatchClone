#!/usr/bin/env node

'use strict'

const fs = require('fs')
const rp = require('request-promise')
const _ = require('lodash')
const Promise = require('bluebird')
const cmd = require('node-cmd')
const cmdAsync = Promise.promisify(cmd.get, {
  multiArgs: true,
  context: cmd
})
const cliProgress = require('cli-progress');

(async () => {
  let argv = require('yargs')
    .usage('Utility to backup all gitlab repos to a local directory')
    .option('token', {
      alias: 't',
      type: 'string',
      description: 'Gitlab Token'
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Backup to output directory, defaults to ./gitlab-backup'
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Enable verbose output'
    })
    .option('url', {
      alias: 'u',
      type: 'string',
      description: 'Specify Gitlab instance URL'
    })
    .option('method', {
      alias: 'm',
      type: 'string',
      description: 'Specify clone method (default is http)'
    })
    .option('apiversion', {
      alias: 'p',
      type: 'string',
      description: 'old gitlab type input [v3], else default [v4].'
    })
    .help(true)
    .argv

  const baseUrl = argv.url || 'https://gitlab.com'
  if(argv.verbose){
    console.log(`Set gitlab url to ${baseUrl}`)
  }
  console.log(`token is ${argv.token}`)
  if (!argv.token) {
    console.log(
      `Please pass your gitlab token using the --token flag,\nGet your token at ${baseUrl}/profile/personal_access_tokens\n\npass --help for full help\n\n`
    )
    process.exit(1)
  }
  
  const method = argv.method == 'ssh' ? 'ssh_url_to_repo' : 'http_url_to_repo'
  console.log(`method is ${method}`)

  const apiversion = argv.apiversion == '' ? 'v4' : argv.apiversion
  console.log(`api version is ${apiversion}`)

  const requestOptions = {
    json: true,
    qs: {
      simple: true
    },
    headers: {
      'PRIVATE-TOKEN': argv.token
    }
  }

  const user = await rp.get(`${baseUrl}/api/${apiversion}/user`, requestOptions)
  if (argv.verbose) {
    console.log(`Got user: ${user.name} (${user.username}) ID: ${user.id}`)
  }

  var projectsUrl = `${baseUrl}/api/${apiversion}/users/${user.id}/projects`
  if (apiversion == 'v3') {
    projectsUrl = `${baseUrl}/api/v3/projects`
  }
  // const personalProjects = await rp.get(projectsUrl, requestOptions)
  // if (argv.verbose) {
  //   console.log(
  //     'Got personal projects:\n',
  //     personalProjects.map(p => p.name)
  //   )
  // }

  // let pgits = _.map(personalProjects, 'http_url_to_repo')
  // console.log(`1. personal projects len = ${pgits.length}`)

  //存放权限内的所有git仓库
  let pgits = new Array()

  const groups = await rp.get(
    `${baseUrl}/api/${apiversion}/groups?per_page=999`,
    requestOptions
  )

  if (argv.verbose) {
    console.log(
      'Got groups:\n', groups.map(g => g.name)
    )
  }

  //const gids = _.map(groups, 'id')
  for (let grp of groups) {
    var gid = grp.id
    var gname = grp.name

    console.log(`====Got projects under group ${gname}(${gid})====`)
    
    // if (apiversion == 'v3') {
      var projects = await rp.get(
        `${baseUrl}/api/${apiversion}/groups/${gid}`,
        requestOptions
      )
      var ps = projects['projects']
    // } else {
    //   var projects = await rp.get(
    //     `${baseUrl}/api/${apiversion}/groups/${gid}/projects?per_page=999`,
    //     requestOptions
    //   )
    //   var ps = _.map(projects, method)
    // }
    
    for (let p of ps) {
      if (argv.verbose) {
        console.log(`Loop group projects ${p.name}(${p.id}) `)
      }
      p.grp = grp
      pgits.push(p)
    }
  }

  console.log(`=======all projects count is ${pgits.length}`)

  if (argv.verbose) {
    console.log('Backing up following repos')
    console.log(pgits)
  }

  const cloneProgressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.legacy
  )
  cloneProgressBar.start(pgits.length, 0)

  let index = 0
  for (let repo of pgits) {
    
    // const repoName = repo.substring(argv.method == 'ssh' ? 15 : 19, repo.length - 4)
    const repoName= repo.grp.name + '/' + repo.name
    const repoRemotePath = repo[method]
    const repoLocalPath = `${argv.output || 'gitlab-backup'}/${repoName}`
  
    console.log(`======== repoName = ${repoName} `)
    console.log(`======== repoRemotePath = ${repoRemotePath}`)
    console.log(`======== repoLocalPath = ${repoLocalPath}`)

    if (fs.existsSync(repoLocalPath)) {
      const stats = fs.statSync(repoLocalPath)

      if (!stats.isDirectory) {
        console.error(`Path ${repoLocalPath} exist and not a directory. Skipped.`)
      } else {
        console.log(`Pulling ${repoName}`)
        const stdout = await cmdAsync(`git -C ${repoLocalPath} pull`).catch(
          console.log
        )
      }
    } else {
      console.log(`Cloning ${repoName}`)
      const stdout = await cmdAsync(`git clone ${repoRemotePath} ${repoLocalPath}`).catch(
        console.log
      )
    }

    cloneProgressBar.update(++index)
  }

  cloneProgressBar.stop()
})()
