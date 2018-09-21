const conf = require(__dirname + "/config.js");
const async = require("async");
const axios = require("axios");
const fastly = require("fastly-promises");
let fastlyService = fastly(conf.fastlyKey, conf.serviceId);

fastlyService.getDictionaryItems = function(dId = conf.dictionaryId){
	return this.request.get(`/service/${this.service_id}/dictionary/${dId}/items`);
}

fastlyService.patchDictionaryItems = function(deltas, dId = conf.dictionaryId){
	return this.request.patch(`/service/${this.service_id}/dictionary/${dId}/items`, deltas);
}

async.auto({
	get_tor_list: function(cb){
		axios.get("https://check.torproject.org/cgi-bin/TorBulkExitList.py?ip=151.101.1.57")
			.then(res =>{
				let ips = res.data.split("\n");

				//remove comments
				ips = ips.filter(ip => ip.charAt(0) != "#");
				cb(null, ips);
			})
			.catch(err => {
				cb(`Failed to retrieve Tor exit node list: ${err}`);
			});
	},
	get_fastly_list: function(cb){
		fastlyService.getDictionaryItems()
			.then(res => {
				cb(null, res.data.map(function(item){
					return item.item_key;
				}));
			})
			.catch(err => {
				cb(`Failed to retrieve current dictionary items: ${err.message}`);
			});
	},
	calc_deltas: ['get_tor_list', 'get_fastly_list', function(results, cb){
		class Delta{
			constructor(op, item_key) {
				this.op = op; //"create" or "delete"
				this.item_key = item_key; // ip address
				if (op === "create")
					this.item_value = "true";
			}
		}

		let deltas = [];
		//remove items that are in the fastly list but not the tor list
		results.get_fastly_list.forEach(function(item){
			if (results.get_tor_list.indexOf(item) == -1)
				deltas.push(new Delta("delete", item));
		});

		//add items that are in the tor list but not in the fastly list
		results.get_tor_list.forEach(function(item){
			if (results.get_fastly_list.indexOf(item) == -1)
				deltas.push(new Delta("create", item));
		});
		cb(null, deltas);
	}],
	patch_dictionary: ['calc_deltas', function(results, cb){
		let res = results.calc_deltas;
		console.log(`Adding ${res.filter(delta => delta.op === "create").length} items and removing ${res.filter(delta => delta.op === "delete").length}.`);

		fastlyService.patchDictionaryItems({items: res})
			.then(res => {
				cb(null);
			})
			.catch(err => {
				let msg = `Failed to update dictionary: ${err.message}`;
				if (err.response.status === 400)
					msg += `\nYou may need to have Fastly increase your Maximum Dictionary Items.`;
				cb(msg);
			});
	}]
}, function(err, results){
	if (err) {
		console.log(err);
	}
	console.log('Done.')
});