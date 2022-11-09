import {JSONObject, optional} from 'ts-json-object';

export class Deck extends JSONObject
{
	@optional('0.0.0.0')
	deckip!: string

	@optional('22')
	deckport!: string

	@optional('ssap')
	deckpass!: string

	@optional('-i ${env:HOME}/.ssh/id_rsa')
	deckkey!: string

	@optional('/home/deck')
	deckdir!: string
}
