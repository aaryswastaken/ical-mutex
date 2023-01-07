const axios = require("axios");

const rN = Number.parseInt(process.argv[2]) ?? 100;
const targetURI = process.argv.slice(3).join("")

console.log("\n ***** Website Benchmarker (good enough edition) ***** ");
console.log(`\nTarget URI: ${targetURI}`);
console.log(`Requests:   ${rN}`);

async function metric(uri) {
	let start = new Date();

	await axios.get(uri);

	return new Date() - start;
}

function computeAvg(array) {
	if (array.length == 0) {
		return 0
	}

	return array.reduce((acc, val) => { return acc + val}, 0) / array.length;
}

function computeStdDev(array, avg) {
	if (array.length == 0) {
		return 0
	}

	if (isNaN(avg) || avg == undefined) {
		avg = computeAvg(array);
	}

	return Math.sqrt(array.reduce((acc, val) => { return acc + (val - avg)**2}, 0) / array.length);
}

function printResult(result) {
	console.log("\n");
	console.log(` Sample counts: ${result.length}`);
	let avg = computeAvg(result);
	console.log(` Average: ${avg} ms`);
	console.log(` Standard deviation: ${computeStdDev(result, avg).toPrecision(3)} ms\n`);
}

async function doTheRequest(uri, rn) {
	let result = [];
	for (let i = 0; i<rn; i++) {
		try {
			let m = await metric(uri);

			console.log(`Finished ${i} with ${m} ms`);

			result.push(m);
		} catch (e) {
			console.log(e)
			break;
		}
	}

	printResult(result);
}

(async () => {await doTheRequest(targetURI, rN)})();
