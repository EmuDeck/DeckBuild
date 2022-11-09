import {array, JSONObject, required} from 'ts-json-object';

export class Publish extends JSONObject {
	@required
	@array(String)
	tags!: string[]

	@required
	description!: string

	@required
	image!: string
}

export class Plugin extends JSONObject
{
	@required
	name!: string;

	@required
	author!: string;

	@required
	@array(String)
	flags!: string[]

	@required
	publish!: Publish
}
