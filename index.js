const http  = require("http");
const axios = require("axios");

const port = 3000;
const open = true;


const server = http.createServer();

server.on("request", async (req, res) => {
	return new Promise((resolve, reject) => {
	    // console.log(req.url.replaceAll(/.*\?/g, ""));
	    let url = req.url.replaceAll(/.*\?/g, "");
		
		function handleSuccess(r) {
			res.setHeader("Content-disposition", "inline; filename=ADECal.ics");
			res.setHeader("Content-Type", "text/calendar;charset=UTF-8");
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

const propertiesName = ['CALSCALE', 'METHOD', 'PRODID', 'VERSION', 'ATTACH', 'CATEGORIES', 'CLASS', 'COMMENT', 'DESCRIPTION', 'GEO', 'LOCATION', 'PERCENT-COMPLETE', 'PRIORITY', 'RESOURCES', 'STATUS', 'SUMMARY', 'COMPLETED', 'DTEND', 'DUE', 'DTSTART', 'DURATION', 'FREEBUSY', 'TRANSP', 'TZID', 'TZNAME', 'TZOFFSETFROM', 'TZOFFSETTO', 'TZURL', 'ATTENDEE', 'CONTACT', 'ORGANIZER', 'RECURRENCE-ID', 'RELATED-TO', 'URL', 'UID', 'EXDATE', 'RDATE', 'RRULE', 'ACTION', 'REPEAT', 'TRIGGER', 'CREATED', 'DTSTAMP', 'LAST-MODIFIED', 'SEQUENCE', 'AnIANA-registeredpropertyname', 'REQUEST-STATUS'];

function isProperty(header) {
	return propertiesName.includes(header) || header.startsWith("X-")
}


function parseMagic(res) {
	let output = "";

	res = res.replaceAll("\r", "");
	let splt = res.split("BEGIN:VEVENT");

	output += splt[0]; // padding

	// parse 
	// splt = splt.map(e => e.replaceAll("END:VEVENT", "")).slice(1); // cleanup
	// splt = splt.map(e => e.split("\n").map(line => line.split(":"))); // split by fields and split key/val in fields

	// splt = splt.map(e => e.map(l => [l[0], l.slice(1).join("")])); // join back values containings : that have been splitted

	// SLOW AS FUCK BUT WORKS LOL
	splt = splt.slice(1).map(e => {
		e = e.replaceAll("END:VEVENT", ""); // Clean last vevent tag

		// Split event by line, split every line by its field name and value and recombine in case some : are floating around after the field name marker
		e = e.split("\n").map(line => {let j = line.split(":"); return [j[0], j.slice(1).join("")]});

		let i = 0;

		let n_e = [];
		let skip = 0;

		while (i < e.length) {
			if (skip > 0) {
				skip--;
			} else {
				n_e.push(e[i]);

				let j = i + 1;
				while (j < e.length) {
					if (!isProperty(e[j][0])) {
						skip += 1;
						n_e[n_e.length - 1][1] += e[j][0] + e[j][1]
					} else {
						j = e.length + 1; // break from closest while
					}

					j++;
				}
			}

			i++;
		}

		return n_e
	}); // join back values that have been splitted by the \n split
	
	splt = splt.map(e => Object.fromEntries(e.filter(j => j[0] != '' && j[0] != ' n')));

	// console.log(splt);
	
	splt = modifyEvents(splt);

	// convert back
	splt.forEach(event => {
		output += "BEGIN:VEVENT\n";
		output += Object.entries(event).map(([key, value]) => key+":"+value).join("\n");
		output += "\nEND:VEVENT\n";
	});

	output += "END:VCALENDAR";

    // return { output: "Error: not implemented yet", error: true, code: 501 };
	
	return { output: output, error: false }
}

function modifyEvents(events) {
	return events.map(event => {
		let id = event.SUMMARY.split("#")[1] ?? 0
		let profName = event.DESCRIPTION.split("\\n")[5];
		event.SUMMARY = formatCourseName(event.SUMMARY.split("-")[2]) + (profName !== "" ? (" - " + profName) : "");
		event.LOCATION = event.LOCATION.split(" - ")[1] ?? "";

		event.DESCRIPTION = event.DESCRIPTION.split("\\n").map((j, i) => (i==1) ? (j + " #" + id.toString()) : j).join("\\n")

		return event;
	});
}

const courseDict = {"LV": "Langue Vivante", "PH": "Physique", "MA": "Mathematiques", "TH": "Thermodynamique", "CF": "Conference", "SOU": "Soutien", "CH": "Chimie", "CO": "Conception", "CE": "Connaissance de l'entreprise"}

function formatCourseName(name) {
	return courseDict[name] ?? name;
}

const ip = open ? "0.0.0.0" : "localhost"
server.listen(port, ip);

console.log(`Listening on ${ip}:${port}`);
