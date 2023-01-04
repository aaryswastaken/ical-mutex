const http  = require("http");
const axios = require("axios");

const port = 3000;
const open = false;


const server = http.createServer();

server.on("request", async (req, res) => {
	return new Promise((resolve, reject) => {
	    // console.log(req.url.replaceAll(/.*\?/g, ""));
	    let url = req.url.replaceAll(/.*\?/g, "");
		
		function handleSuccess(r) {
			res.writeHead(200);
			res.end(r.output);
			resolve();
		}
	
		function handleError(r) {
			res.writeHead(r.code);
			res.end(r.output);
			resolve();
		}
	
		handleReq(url)
			.then(response => {
				if (response.error) {
					handleError(response);
				} else {
					handleSuccess(response);
				}
			}).catch(error => {
				handleError(error);
			});
	});
});

function handleReq(url) {
    return new Promise((resolve, reject) => {
        if (url.match(/https:\/\/ade-outils\.insa-lyon\.fr\/ADE-Cal:/gm)) {
			console.log("Going for url: "+url);
            axios.get(url)
				.then(response => {
					console.log("Response code from ADE: "+response.status); // console.log("Status code: "+res.statusCode.toString());
					if (response.status == 200) {
	                    let r = parseMagic(response.data);
		
						if (r.error) {
							reject(r);
						} else {
							resolve(r);
						}
					} else {
						reject({ output: "ADE returned code "+response.status.toString(), error: true, code: response.status });
					}
				})
				.catch(error => {
					console.log("An error occured: "+error);
					reject({ output: "An error occured while trying to connect to ADE: "+error, error: true, code: 400 })
				});
        } else {
            reject({ output: "An error occured", error: true });
        }
    })
}


function parseMagic(res) {
	let output = "";

	res = res.replaceAll("\r", "");
	let splt = res.split("BEGIN:VEVENT");

	output += splt[0]; // padding
	splt = splt.map(e => e.replaceAll("END:VEVENT", "")).slice(1);
	splt = splt.map(e => e.split("\n").map(line => line.split(":")));

	splt = splt.map(e => e.map(l => [l[0], l.slice(1).join("")]));
	
	splt = splt.map(e => Object.fromEntries(e.filter(j => j[0] != '' && j[0] != ' n')));

	console.log(splt);

    return { output: "Error: not implemented yet", error: true, code: 501 };
}

const ip = open ? "0.0.0.0" : "localhost"
server.listen(port, ip);

console.log(`Listening on ${ip}:${port}`);
