#!/usr/bin/env node

import yargs from 'yargs';
import {Deck} from './deck';
import {Plugin} from './plugin';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as child_process from 'child_process';
import {glob} from 'glob';
import {Package} from './package';
let deck: Deck;
let plugin: Plugin;
let package_: Package;
if (fs.existsSync(path.join(process.cwd(), 'package.json')))
{
	package_ = new Package(require(path.join(process.cwd(), 'package.json')))
	console.log(package_);
	if (fs.existsSync(path.join(process.cwd(), 'plugin.json')))
	{
		plugin = new Plugin(require(path.join(process.cwd(), 'plugin.json')));
		console.log(plugin);
	}
	else throw new Error(path.join(process.cwd(), 'plugin.json') + ' does not exist');
}
else throw new Error(path.join(process.cwd(), 'package.json') + ' does not exist');

void yargs
	.scriptName('dbuild')
	.command({
		command: 'build',
		aliases: ['b'],
		describe: 'Builds a plugin and creates a zip file for distribution',
		handler: build,
		builder: {},
	})
	.command({
		command: 'deploy',
		aliases: ['d'],
		describe: 'Deploys a plugin to a test deck',
		handler: deploy,
		builder: {},
	})
	.demand(1, 'must provide a valid command')
	.help('h')
	.alias('h', 'help')
	.parse(process.argv.slice(2))

function build()
{
	if (fs.existsSync(path.join(process.cwd(), 'build')))
	{
		fs.rmdirSync(path.join(process.cwd(), 'build'), {
			recursive: true
		})
		fs.mkdirSync(path.join(process.cwd(), 'build', plugin.name, 'dist'), {
			recursive: true
		})
	}
	else
	{
		fs.mkdirSync(path.join(process.cwd(), 'build', plugin.name, 'dist'), {
			recursive: true
		})
	}
	//pull docker images
	child_process.execSync('docker pull ghcr.io/steamdeckhomebrew/builder:latest')
	child_process.execSync('docker pull ghcr.io/steamdeckhomebrew/holo-base:latest')

	//backend
	console.log(`Detecting backend for plugin ${plugin.name}`);
	const docker_name = `backend-${plugin.name.toLowerCase().replace(' ', '-')}`;
	const dockerfile_exists = fs.existsSync(path.join(process.cwd(), 'backend', 'Dockerfile'));
	const entrypoint_exists = fs.existsSync(path.join(process.cwd(), 'backend', 'entrypoint.sh'));
	if (dockerfile_exists)
	{
		console.log('Grabbing provided dockerfile.');
		console.log('Building provided Dockerfile.');
		child_process.execSync(`docker build -f ${path.join(process.cwd(), 'backend', 'Dockerfile')} -t "${docker_name}" .`)
		fs.mkdirSync(path.join(process.cwd(), 'build', 'backend', 'out'), {
			recursive: true
		})
		if (entrypoint_exists)
		{
			console.log(`Running docker image "${docker_name}" with provided entrypoint script.`)
			child_process.execSync(`docker run --rm -i -v ${path.join(process.cwd(), 'backend')}:/backend -v ${path.join(process.cwd(), 'build', 'backend', 'out')}:/backend/out --entrypoint /backend/entrypoint.sh "${docker_name}"`)
		}
		else
		{
			console.log(`Running docker image "${docker_name}" with entrypoint script specified in Dockerfile.`)
			child_process.execSync(`docker run --rm -i -v ${path.join(process.cwd(), 'backend')}:/backend -v ${path.join(process.cwd(), 'build', 'backend', 'out')}:/backend/out "${docker_name}"`)
		}
		fs.mkdirSync(path.join(process.cwd(), 'build', plugin.name, 'bin'), {
			recursive: true
		})
		fs.copySync(path.join(process.cwd(), 'build', 'backend', 'out'), path.join(process.cwd(), 'build', plugin.name, 'bin'), {
			recursive: true,
			overwrite: true
		})
		child_process.execSync(`docker image rm "${docker_name}"`)
		console.log(`Built ${plugin.name} backend`)
	}
	else if (!dockerfile_exists && entrypoint_exists)
	{
		console.log('Grabbing default docker image and using provided entrypoint script.')
		fs.mkdirSync(path.join(process.cwd(), 'build', 'backend', 'out'), {
			recursive: true
		})
		child_process.execSync(`docker run --rm -i -v ${path.join(process.cwd(), 'backend')}:/backend -v ${path.join(process.cwd(), 'build', 'backend', 'out')}:/backend/out ghcr.io/steamdeckhomebrew/holo-base:latest`)
		fs.mkdirSync(path.join(process.cwd(), 'build', plugin.name, 'bin'), {
			recursive: true
		})
		fs.copySync(path.join(process.cwd(), 'build', 'backend', 'out'), path.join(process.cwd(), 'build', plugin.name, 'bin'), {
			recursive: true,
			overwrite: true
		})
		console.log(`Built ${plugin.name} backend`)
	}
	else
	{
		console.log(`Plugin ${plugin.name} does not have a backend`)
	}
	//frontend
	child_process.execSync(`docker run --rm -i -v ${process.cwd()}:/plugin -v ${path.join(process.cwd(), 'build', plugin.name)}:/out ghcr.io/steamdeckhomebrew/builder:latest`)
	console.log(` Built ${plugin.name} frontend`)

	//zip
	const zip = `${plugin.name}-${package_.version}.zip`;
	const license = (fs.existsSync(path.join(process.cwd(), 'LICENSE')) ? 'LICENSE' : fs.existsSync(path.join(process.cwd(), 'license')) ? 'license' : fs.existsSync(path.join(process.cwd(), 'LICENSE.md')) ? 'LICENSE.md' : fs.existsSync(path.join(process.cwd(), 'license.md')) ? 'license.md' : undefined)
	const readme = (fs.existsSync(path.join(process.cwd(), 'README.md')) ? 'README.md' : fs.existsSync(path.join(process.cwd(), 'readme.md')) ? 'readme.md' : undefined)
	const has_python = glob.sync(path.join(process.cwd(), '*.py')).length > 0
	const has_bin = fs.existsSync(path.join(process.cwd(), 'build', plugin.name, 'bin'))
	const has_defaults = fs.existsSync(path.join(process.cwd(), 'defaults'))

	process.chdir('build')
	child_process.execSync(`zip -r ${path.join(process.cwd(), zip)} ${path.join(plugin.name, 'dist')} ${path.join(plugin.name, 'plugin.json')} ${path.join(plugin.name, 'package.json')}`)

	if (has_bin)
	{
		child_process.execSync(`zip -r ${path.join(process.cwd(), zip)} ${path.join(plugin.name, 'bin')}`);
	}

	if (has_python)
	{
		child_process.execSync(`find ${plugin.name} -maxdepth 1 -type f -name '*.py' -exec zip -r ${path.join(process.cwd(), zip)} {} \\;`)
	}

	if (has_defaults)
	{
		if (!fs.existsSync(path.join(plugin.name, 'defaults', 'defaults.txt')))
		{
			const defaults = fs.opendirSync(path.join(plugin.name, 'defaults'))
			for (const name in defaults)
			{
				fs.copySync(path.join(plugin.name, 'defaults', name), path.join(plugin.name, name), {
					recursive: true
				});
				child_process.execSync(`zip -r ${path.join(process.cwd(), zip)} ${path.join(plugin.name, name)}`)
			}
		}
		else
		{
			if (package_.name !== 'decky-plugin-template')
			{
				throw new Error('defaults.txt found in defaults folder, please remove either defaults.txt or the defaults folder.')
			}
			else
			{
				console.log('plugin template, allowing defaults.txt')
			}
		}
	}

	if (license)
	{
		child_process.execSync(`zip -r ${path.join(process.cwd(), zip)} ${path.join(plugin.name, license)}`)
	}

	if (readme)
	{
		child_process.execSync(`zip -r ${path.join(process.cwd(), zip)} ${path.join(plugin.name, readme)}`)
	}
	process.chdir('..')
}

function deploy()
{
	if (fs.existsSync(path.join(process.cwd(), 'deck.json')))
	{
		deck = new Deck(require(path.join(process.cwd(), 'deck.json')));
		console.log(deck);
	}
	else throw new Error(path.join(process.cwd(), 'deck.json') + ' does not exist');
	build()
	const zip = `${plugin.name}-${package_.version}.zip`;
	child_process.execSync(`unzip ${path.join(process.cwd(), 'build', zip)} -d ${path.join(process.cwd(), 'build', 'deploy')}`)
	child_process.execSync(`ssh witherking25@${deck.deckip} -p ${deck.deckport} ${deck.deckkey.replace('$HOME', process.env.HOME ? process.env.HOME : '')} 'mkdir -p ${deck.deckdir}/homebrew/pluginloader && mkdir -p ${deck.deckdir}/homebrew/plugins'`)
	child_process.execSync(`ssh witherking25@${deck.deckip} -p ${deck.deckport} ${deck.deckkey.replace('$HOME', process.env.HOME ? process.env.HOME : '')} 'echo "${deck.deckpass}" | sudo -S chmod -R ug+rw ${deck.deckdir}/homebrew/'`)
	child_process.execSync(`rsync -azp --delete --chmod=D0755,F0755 --rsh='ssh -p ${deck.deckport} ${deck.deckkey.replace('$HOME', process.env.HOME ? process.env.HOME : '')}' ${path.join(process.cwd(), 'build', 'deploy', plugin.name)} witherking25@${deck.deckip}:${deck.deckdir}/homebrew/plugins`)
}

