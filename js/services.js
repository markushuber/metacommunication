'use strict';

/* Services */

var app = angular.module('mcApp.services', []);



app.factory('SharedDataFactory', function() {
	var databaseValues = {}; //[{"service":"TEL", "duration":10}, {"service":"TEL", "duration":50}, {"service":"TEL", "duration":100}, {"service":"SMS", "duration":150} ];
    var availableSources = [];
    var inputFormat = undefined;
	
	return {
		getDatabaseValues: function() {
			return databaseValues;
		},
		setDatabaseValues: function(pDatabaseValues) {
			databaseValues = pDatabaseValues;
		},
        getAvailableSources: function() {
//            console.log("SharedDataFactory.getAvailableSources called: ", availableSources);
        	return availableSources;
        },
        setAvailableSources: function(pAvailableSources) {
//            console.log("SharedDataFactory.setAvailableSources=", pAvailableSources);
            availableSources = pAvailableSources;
        },
        getInputFormat: function() {
        	return inputFormat;
        },
        setInputFormat: function(pInputFormat) {
        	inputFormat = pInputFormat;
        }
	};
});




app.factory('ParseFactory', function($q) {
	
	var global = {
			
			removeGermanUmlaut: function(inputString) {
				var result = inputString.replace(/\u00c4/g, "AE"); // Ä
				result = result.replace(/\u00e4/g, "ae"); // ä
				result = result.replace(/\u00d6/g, "OE"); // Ö
				result = result.replace(/\u00f6/g, "oe"); // ö
				result = result.replace(/\u00dc/g, "UE"); // Ü
				result = result.replace(/\u00fc/g, "ue"); // ü
				result = result.replace(/\u00df/g, "sz"); // ß
				return result;
			},
			
			getEnglishMonth: function(germanDate) {
				var englishDate = germanDate;
				if (/Jaen/.test(germanDate)) { englishDate = germanDate.replace(/Jaen\w*/, "January"); 
				} else if (/Feb/.test(germanDate)) { englishDate = germanDate.replace(/Feb\w*/, "February");
				} else if (/Maer/.test(germanDate)) { englishDate = germanDate.replace(/Maer\w*/, "March");
				} else if (/Apr/.test(germanDate)) { englishDate = germanDate.replace(/Apr\w*/, "April");
				} else if (/Mai/.test(germanDate)) { englishDate = germanDate.replace(/Mai/, "May");
				} else if (/Jun/.test(germanDate)) { englishDate = germanDate.replace(/Jun\w*/, "June");
				} else if (/Jul/.test(germanDate)) { englishDate = germanDate.replace(/Jul\w*/, "July");
				} else if (/Aug/.test(germanDate)) { englishDate = germanDate.replace(/Aug\w*/, "August");
				} else if (/Sep/.test(germanDate)) { englishDate = germanDate.replace(/Sep\w*/, "September");
				} else if (/Okt/.test(germanDate)) { englishDate = germanDate.replace(/Okt\w*/, "October");
				} else if (/Nov/.test(germanDate)) { englishDate = germanDate.replace(/Nov\w*/, "November");
				} else if (/Dez/.test(germanDate)) { englishDate = germanDate.replace(/Dez\w*/, "December"); 
				}
				return englishDate;
			},
			
			pushLine: function(pResultArray, pFrom, pTo, pService, pDate, pTime, pDuration, pUpload, pDownload, pSource) {
				var line = {};
				Object.defineProperties(line, { 
					from : { value: pFrom, enumerable: true },
					to : { value: pTo, enumerable: true },
					service : { value: pService, enumerable: true },
					date : { value: pDate, enumerable: true },
					time : { value: pTime, enumerable: true },
					timestamp : { value: 0, enumerable: true }, // calc from date/time
					duration : { value: pDuration, enumerable: true },
					datavolume : { value: pUpload + pDownload, enumerable: true },
					source: { value: pSource, enumerable: true }
				});
				pResultArray.push(eval(line));
			},
			
			
			normalizePhoneNumber : function (phoneNumber) {
			if (phoneNumber) {
				
				phoneNumber = phoneNumber.replace(/\*/g, "X"); // YES phone number has * instead of X for masking numbers
				for (var i = phoneNumber.length-1; phoneNumber.indexOf("XXX") == -1; i--) { // anonymise numbers
					phoneNumber = phoneNumber.substr(0, i) + "X" + phoneNumber.substr(i+1);
				}
				// remove non-numeric and non-X characters
				var pattern = /\D/;				
				var character = pattern.exec(phoneNumber);
				while(character && character != "X") {
					phoneNumber = phoneNumber.substr(0, phoneNumber.indexOf(character)).concat(phoneNumber.substr(phoneNumber.indexOf(character)+1));
					character = pattern.exec(phoneNumber);
				}
				// remove leading "0"
	        	while(phoneNumber[0] == '0') {
	        		phoneNumber = phoneNumber.substr(1);
	        	}
	        	// if not 43: start with 0043
	        	if (phoneNumber.indexOf('43') == -1 || phoneNumber.indexOf('43') > 0) {
	        		phoneNumber = '0043'.concat(phoneNumber);
	        	}
	        	else { // else start with 00
	        		phoneNumber = '00'.concat(phoneNumber);
	        	}
        	
			} // end if phonenumber
        	return phoneNumber;
        },
		/*
		 * PARSE BOB FILE
		 */	
		parseBobFile : function(fileName, lines) {
			var relevantLineLength = [13];
			var result = new Array();

			var mapping = { from: 0, date: 1, time: 2, service: 3, duration: 4, to: 8, upload: 9, download: 10, datavolume: 11 };
			
			function getService(service) {
				if (service === "SMS" || service === "TEL") {
					return service;
				} else {
					return "DATA";
				}
			}
			
            function calcDuration(service, duration) {
                if (getService(service) === "SMS") {
                    return 1;
                } else if (getService(service) === "TEL") {
                    return (d3.time.format("%H:%M:%S").parse(duration).getTime() - d3.time.format("%H:%M:%S").parse("00:00:00").getTime()) / 1000;
                    /* hh:mm:ss --> seconds */
                } else {
                	return 0;
                }
            }
            
            function getDatavolume(service, datavolume) {
            	if (getService(service) === "DATA") {
            		if (datavolume) {
            			datavolume = datavolume.replace(".", "");
            			datavolume = datavolume.replace(",", ".");
            			return parseInt(datavolume);
            		} else {
            			return 0;
            		}
            	} else {
            		return 0;
            	}
            }
            
			for (var i = 0; i < lines.length; i++)
			{
				if (relevantLineLength.indexOf(lines[i].length) > -1  && d3.time.format("%d.%m.%Y").parse(lines[i][mapping.date]) != null) {
					global.pushLine(result, // resultArray
							global.normalizePhoneNumber(lines[i][mapping.from]), // from 
							((getService(lines[i][mapping.service]) == "SMS" || getService(lines[i][mapping.service]) == "TEL")?  
									global.normalizePhoneNumber(lines[i][mapping.to]) : lines[i][mapping.to]), // to 
							getService(lines[i][mapping.service]), // service
							d3.time.format("%Y-%m-%d")(d3.time.format("%d.%m.%Y").parse(lines[i][mapping.date])), // date
							lines[i][mapping.time], // time
							calcDuration(lines[i][mapping.service], lines[i][mapping.duration]), // duration
							getDatavolume(lines[i][mapping.service], lines[i][mapping.upload]), // upload
							getDatavolume(lines[i][mapping.service], lines[i][mapping.download]), // download
							fileName); // source filename
				}
			}
			return result;
		},
		/*
		 * PARSE YES FILE
		 */	
		parseYesFile : function(fileName, lines) {
			var relevantLineLength = [7];
			var result = new Array();

			var mapping = { date: 0, time: 1, from: 2, to: 3, service: 4, datavolume: 4, duration: 5 };
			
			function getService(service) {
				if (service === "SMS") {
					return service;
				} else if (/telefonie/i.test(service) || /preisregulierter/i.test(service)) {
					return "TEL";
				} else if (service.search(/datentransfer/i) == 0) {
					return "DATA";
				} else {
					return "UNKOWN SERVICE";
				}
			}
			
            function calcDuration(service, duration) {
                if (getService(service) === "SMS") {
                    return 1;
                } else if (getService(service) === "TEL") {
                    return (d3.time.format("%H:%M:%S").parse(duration).getTime() - d3.time.format("%H:%M:%S").parse("00:00:00").getTime()) / 1000;
                    /* hh:mm:ss --> seconds */
                } else {
                	return 0;
                }
            }
            
            function getDatavolume(service, datavolume) {
            	var result = 0;
            	
            	if (getService(service) === "DATA") {            		
            		var pattern = /\d+,\d/;
            		if (datavolume) {
            			var buffer = pattern.exec(datavolume);
            			if (buffer) {
	            			if (/KB/.test(datavolume)) {
	            				result = parseInt(buffer[0]);
	            			} else if (/MB/.test(datavolume)){
	            				result = parseFloat(buffer[0]);
	            				result = result * 1024;
	            			} else {
	            				result = 0;
	            			}
            			} else {
            				result = 0;
            			}
            			
            		} // end if datavolume

            	} // end if service == DATA
            	
            	return result;            	
            }
            
//            var parsed = lines.forEach(function(item) {
//            	return relevantLineLength.indexOf(item.length); 
//            });

			for (var i = 0; i < lines.length; i++)
			{
				if (relevantLineLength.indexOf(lines[i].length) > -1  && d3.time.format("%d.%m.%Y").parse(lines[i][mapping.date]) != null) {
					global.pushLine(result, // resultArray
							global.normalizePhoneNumber(lines[i][mapping.from]), // from 
							((getService(lines[i][mapping.service]) == "SMS" || getService(lines[i][mapping.service]) == "TEL")?  
									global.normalizePhoneNumber(lines[i][mapping.to]) : lines[i][mapping.to]), // to 
							getService(lines[i][mapping.service]), // service
							d3.time.format("%Y-%m-%d")(d3.time.format("%d.%m.%Y").parse(lines[i][mapping.date])), // date
							lines[i][mapping.time], // time
							calcDuration(lines[i][mapping.service], lines[i][mapping.duration]), // duration
							0, // upload
							getDatavolume(lines[i][mapping.service], lines[i][mapping.datavolume]), // download
							fileName); // source filename
				}
			}
			return result;
		},
		/*
		 * PARSE TELERING FILE
		 */	
		parseTeleringFile : function(fileName, lines) {
			var relevantLineLength = [9];
			var result = new Array();

			var mapping = { from: 0, date: 1, time: 2, duration: 3, to: 4, service: 6, download: 7, upload: 8 };
			
			function getService(service) {
				if (/SMS/.test(service) || /MMS/.test(service)) {
					return "SMS";
				} else if (/Internet/.test(service)) { 
					return "DATA";
				} else if (/Inland Mobile/.test(service) 
						|| /A1/.test(service) 
						|| /Drei/.test(service) 
						|| /Festnetz/.test(service) 
						|| /Orange/.test(service) 
						|| /tele\.ring/.test(service) 
						|| /T-Mobile/.test(service)) {
					return "TEL";
				} else {
					return "UNKOWN SERVICE";
				}	
			}
			
            function calcDuration(service, duration) {
                if (getService(service) === "SMS") {
                    return 1;
                } else if (getService(service) === "TEL") {
                	if (/\d{2}:\d{2}:\d{2}/.test(duration)) {
                    	return (d3.time.format("%H:%M:%S").parse(duration).getTime() - d3.time.format("%H:%M:%S").parse("00:00:00").getTime()) / 1000;
                	} else {
                		return 0;
                	}
                    /* hh:mm:ss --> seconds */
                } else {
                	return 0;
                }
            }
            
            function getDatavolume(service, datavolume) {
            	var result = 0;
            	if (getService(service) === "DATA") {            		
            		if (datavolume && !isNaN(datavolume)) {
            			result = parseInt(datavolume);
            		} else {
            			result = 0;
            		}
            	}
            	return result;
            }
            
			for (var i = 0; i < lines.length; i++)
			{
				if (relevantLineLength.indexOf(lines[i].length) > -1  && d3.time.format("%d-%m-%Y").parse(lines[i][mapping.date]) != null) {
					global.pushLine(result, // resultArray
							global.normalizePhoneNumber(lines[i][mapping.from]), // from 
							((getService(lines[i][mapping.service]) == "SMS" || getService(lines[i][mapping.service]) == "TEL")?  
									global.normalizePhoneNumber(lines[i][mapping.to]) : lines[i][mapping.to]), // to 
							getService(lines[i][mapping.service]), // service
							d3.time.format("%Y-%m-%d")(d3.time.format("%d-%m-%y").parse(lines[i][mapping.date])), // date
							lines[i][mapping.time], // time
							calcDuration(lines[i][mapping.service], lines[i][mapping.duration]), // duration
							getDatavolume(lines[i][mapping.service], lines[i][mapping.upload]), // upload
							getDatavolume(lines[i][mapping.service], lines[i][mapping.download]), // download
							fileName); // source filename
				}
			}
			return result;
		},
		/*
		 * PARSE A1 PDF
		 */
		parseA1PdfFile : function(fileName, fileContent) {
			var deferred = $q.defer(); // promise
			var result = new Array();
			var pdfObject = undefined;
			var pageNumber = 0;
			var from = undefined;
			var rechnungsdatum = undefined;
			var service = undefined;
			
			var handlePdf = function(arrayBuffer) {
//				console.log("handlePdf");
				PDFJS.disableWorker = true;
			    var pdf = PDFJS.getDocument(arrayBuffer);
			    pdf.then(renderPdf);
			};

			var renderPdf = function (pdf) {
//				console.log("renderPdf", pdf);
				pdfObject = pdf;
				pageNumber = 0;
				renderPdfInternal();
			};

			var renderPdfInternal = function () {
				if (pageNumber < pdfObject.numPages) {
					console.log("renderPdfInternal ", pageNumber+1, " from ", pdfObject.numPages);
					pdfObject.getPage(++pageNumber).then(renderPage);
				} else {
					console.log("parseA1PdfFile finished:", fileName);
					deferred.resolve(result);
//					pdfParsing.result.files.push(pdfParsing.current.fileName);
//					readFileListInternal();
				}
				
			};


			var renderPage = function (page) {
				console.log("renderPage", page.pageNumber);
				page.getTextContent().then(function (textContent) {
//					console.log("page.getTextContent()", textContent); // pageContents
					
					var items = textContent.items;
					
					for (var i = 0; i < items.length; i++) {
						var text = global.removeGermanUmlaut(items[i].str);
//						console.log("item ", i, text);
						if (!rechnungsdatum && text == "Rechnungsdatum:") {
							rechnungsdatum =  d3.time.format("%d.%m.%Y").parse(items[i+1].str);
//							console.log("rechungsdatum=", rechnungsdatum);
						} else if (!from && /Ihre Rufnummer.+/.test(text)) {
							from = /\d+\/\d+/.exec(text);
							if (from) {
								from = global.normalizePhoneNumber(from[0]);
								console.log("from=", from);
							}
							// SMS
						} else if (/^Telefonie$/.test(text) && /^OEsterreich - A1 Telekom Austria$/.test(global.removeGermanUmlaut(items[i-1].str))) {
							service = "TEL";
						} else if (/^SMS$/.test(text) && /^OEsterreich - A1 Telekom Austria$/.test(global.removeGermanUmlaut(items[i-1].str))) {
							service = "SMS";
						} else if (/^MMS$/.test(text) && /^OEsterreich - A1 Telekom Austria$/.test(global.removeGermanUmlaut(items[i-1].str))) {
							service = "SMS";
						} else if (/^GPRS$/.test(text) && /^OEsterreich - A1 Telekom Austria$/.test(global.removeGermanUmlaut(items[i-1].str))) {
							service = "DATA";
						} else if (/^UMTS$/.test(text) && /^OEsterreich - A1 Telekom Austria$/.test(global.removeGermanUmlaut(items[i-1].str))) {
							service = "DATA";
						} else if (service == "TEL" && /^\d{2}\.\d{2}\.\d{2}$/.test(text)) { // TEL
							global.pushLine(result, // resultArray
								from, // from 
								global.normalizePhoneNumber(items[i+5].str), // to 
								"TEL", // service
								d3.time.format("%Y-%m-%d")(d3.time.format("%d.%m.%y").parse(text)),
								items[i+1].str, // time
								(d3.time.format("%H:%M:%S").parse(items[i+2].str).getTime() - d3.time.format("%H:%M:%S").parse("00:00:00").getTime()) / 1000,
								0, // upload
								0, // download
								fileName); // source filename
						} else if (service == "SMS" && /^\d{2}\.\d{2}\.\d{2}$/.test(text)) { // SMS
							global.pushLine(result, // resultArray
								from, // from 
								global.normalizePhoneNumber(items[i+5].str), // to 
								"SMS", // service
								d3.time.format("%Y-%m-%d")(d3.time.format("%d.%m.%y").parse(text)),
								items[i+1].str, // time
								1, // duration
								0, // upload
								0, // download
								fileName); // source filename
						} else if (service == "DATA" && /^\d{2}\.\d{2}\.\d{2}$/.test(text)) { // DATA
							var upload = /^\d+,\d+ \w\w/.test(items[i+3].str)? /^(\d+,\d+) (\w\w)/.exec(items[i+3].str) : 0;
							if (upload) {
								upload = parseFloat(upload[1].replace(",", ".")) * (/MB/.test(upload[2])? 1024 : 1);
							}
							var download = /\d+,\d+ \w\w$/.test(items[i+3].str)? /(\d+,\d+) (\w\w)$/.exec(items[i+3].str) : 0;
							if (download) {
								download = parseFloat(download[1].replace(",", ".")) * (/MB/.test(download[2])? 1024 : 1);
							}
							global.pushLine(result, 
								from, // from 
								"A1", // to
								"DATA", // service
								d3.time.format("%Y-%m-%d")(d3.time.format("%d.%m.%y").parse(text)),
								items[i+1].str, // time
								0, // duration
								upload, //upload 
								download, // download 
								fileName); // source
						}
					} // end for
			    }).then(renderPdfInternal);
			 };
			  
			 handlePdf(fileContent);
			 return deferred.promise;
		},
		
		/*
		 * PARSE DREI PDF
		 */
		parseDreiPdfFile : function(fileName, fileContent) {
			var deferred = $q.defer(); // promise
			var result = new Array();
			var pdfObject = undefined;
			var pageNumber = 0;
			var from = undefined;
			var rechnungsdatum = undefined, rechnungsjahr = undefined;
			var rechnungsjahrFormat = d3.time.format("%Y");
			
			var handlePdf = function(arrayBuffer) {
//				console.log("handlePdf");
				PDFJS.disableWorker = true;
			    var pdf = PDFJS.getDocument(arrayBuffer);
			    pdf.then(renderPdf);
			};

			var renderPdf = function (pdf) {
//				console.log("renderPdf", pdf);
				pdfObject = pdf;
				pageNumber = 0;
				renderPdfInternal();
			};

			var renderPdfInternal = function () {
				if (pageNumber < pdfObject.numPages) {
//					console.log("renderPdfInternal ", pageNumber+1, " from ", pdfObject.numPages);
					pdfObject.getPage(++pageNumber).then(renderPage);
				} else {
					console.log("parseDreiPdfFile finished:", fileName);
					deferred.resolve(result);
//					pdfParsing.result.files.push(pdfParsing.current.fileName);
//					readFileListInternal();
				}
				
			};


			var renderPage = function (page) {
				console.log("renderPage", page.pageNumber);
				page.getTextContent().then(function (textContent) {
//					console.log("page.getTextContent()", textContent); // pageContents
					
					var items = textContent.items;
					
					for (var i = 0; i < items.length; i++) {
						var text = global.removeGermanUmlaut(items[i].str);
//						console.log("item ", i, text);
						if (!rechnungsdatum && text == "Rechnungsdatum") {
							var date = global.getEnglishMonth(global.removeGermanUmlaut(items[i+3].str));
							rechnungsdatum =  d3.time.format("%d. %B %Y").parse(date);
							rechnungsjahr = rechnungsjahrFormat(rechnungsdatum);
//							console.log("rechungsdatum=", rechnungsdatum);
//							console.log("rechnungsjahr=", rechnungsjahr);
						} else if (!from && /Detailuebersicht fuer/.test(text)) {
							from = /\d+/.exec(text);
							if (from) {
								from = global.normalizePhoneNumber(from[0]);
								console.log("from=", from);
							}
							// SMS
						} else if (/^SMS$/.test(text) || /^SMS zu 3$/.test(text) && items[i+1].str.indexOf("00") == 0) { // skip header "SMS zu 3" --> check next field for telephone number
//							console.log("SMS:", items[i-2].str, items[i-1].str, items[i].str, items[i+1].str, items[i+2].str);
							var month = /\w{3,}/.exec(global.removeGermanUmlaut(items[i-2].str));
							if (month && month.length == 1) {
								month = global.getEnglishMonth(month[0]);
							}
							var dateItem = d3.time.format("%e. %B %Y").parse(/\d{1,2}\./.exec(items[i-2].str) + " " + month + " " + rechnungsjahr );
							if (dateItem.getTime() > rechnungsdatum.getTime()) {
								dateItem = d3.time.format("%e. %B %Y").parse(/\d{1,2}\./.exec(items[i-2].str) + " " + month + " " + (rechnungsjahr-1) );
							}
							var dateItem2 = d3.time.format("%Y-%m-%d")(dateItem);
							global.pushLine(result, // resultArray
									from, // from 
									global.normalizePhoneNumber(items[i+1].str), // to 
									"SMS", // service
									dateItem2, // date
									items[i-1].str, // time
									1, // duration
									0, // upload
									0, // download
									fileName); // source filename
							// TEL
						} else if (/^3$/.test(text) || /^A1$/.test(text) || /^Festnetz$/.test(text) || /^Telering$/.test(text)) {
//							console.log("TEL:", items[i-2].str, items[i-1].str, items[i].str, items[i+1].str, items[i+2].str);
							var month = /\w{3,}/.exec(global.removeGermanUmlaut(items[i-2].str));
							if (month && month.length == 1) {
								month = global.getEnglishMonth(month[0]);
							}
							var dateItem = d3.time.format("%e. %B %Y").parse(/\d{1,2}\./.exec(items[i-2].str) + " " + month + " " + rechnungsjahr );
							if (dateItem.getTime() > rechnungsdatum.getTime()) {
								dateItem = d3.time.format("%e. %B %Y").parse(/\d{1,2}\./.exec(items[i-2].str) + " " + month + " " + (rechnungsjahr-1) );
							}
							var dateItem2 = d3.time.format("%Y-%m-%d")(dateItem);
							global.pushLine(result, // resultArray
									from, // from 
									global.normalizePhoneNumber(items[i+1].str), // to 
									"TEL", // service
									dateItem2, // date
									items[i-1].str, // time
									function(value) { 
										var time = "00:00:00"; var offset = time.length - value.length;
										for (var j = value.length - 1; j >= 0; j--) {
											time = time.substr(0, j+offset).concat(value[j]).concat(time.substr(j+offset+1));
//											time[j+offset] = value[j];
										} // end for
										return (d3.time.format("%H:%M:%S").parse(time).getTime() - d3.time.format("%H:%M:%S").parse("00:00:00").getTime()) / 1000;
									}(items[i+2].str),
									0, // upload
									0, // download
									fileName); // source filename
							// DATA
						} else if (/^Internet Dienste$/.test(text)) {
//							console.log("DATA:", items[i-4].str, items[i-3].str, items[i].str, items[i+1].str, items[i+2].str);
//							global.pushLine(result, from, undefined, "DATA", items[i-4].str, items[i-3].str, 0, items[i+1].str + items[i+2].str, fileName);
							var month = /\w{3,}/.exec(global.removeGermanUmlaut(items[i-4].str));
							if (month && month.length == 1) {
								month = global.getEnglishMonth(month[0]);
							}
							var dateItem = d3.time.format("%e. %B %Y").parse(/\d{1,2}\./.exec(items[i-4].str) + " " + month + " " + rechnungsjahr );
							if (dateItem.getTime() > rechnungsdatum.getTime()) {
								dateItem = d3.time.format("%e. %B %Y").parse(/\d{1,2}\./.exec(items[i-4].str) + " " + month + " " + (rechnungsjahr-1) );
							}
							var dateItem2 = d3.time.format("%Y-%m-%d")(dateItem);
							global.pushLine(result, 
									from, // from 
									"Drei", // to
									"DATA", // service
									dateItem2, // date
									items[i-3].str, // time
									0, // duration
									((/\d+,\d+/.test(items[i+2].str))? parseFloat(/\d+,\d+/.exec(items[i+2].str))*1024 : 0), // upload 
									((/\d+,\d+/.test(items[i+1].str))? parseFloat(/\d+,\d+/.exec(items[i+1].str))*1024 : 0), // download 
									fileName); // source
						}
					}
					
			    }).then(renderPdfInternal);
			 };
			  
			 handlePdf(fileContent);
			 return deferred.promise;
		},
		/*
		 * PARSE T-MOBILE FILE
		 */
		parseTMobileFile : function(fileName, lines) {
			var relevantLineLength = [6/*TEL*/,7/*SMS, DATA*/];
			var result = new Array();
			var from = undefined;
			// TEL
			var mappingTEL = { date: 0, time: 1, to: 2, duration: 3 };
			// SMS, DATA
			var mappingSMSDATA = { date: 0, time: 1, to: 2, service: 3, upload: 4, download: 5 };
			
			var patternSMS = new RegExp("SMS", "i");
			var patternDATA = new RegExp("gprsinternet", "i");
			
			function getFrom(line) {
				if (!from) {
					var rufnummer = /Rufnummer: .+/.exec(line); 
					from = global.normalizePhoneNumber(rufnummer[0].substr(11));
				}
			}
			
			function getService(service) {
				if (service === "TEL") {
					return service;
				} else if (patternSMS.test(service)) {
					return "SMS";
				} else if (patternDATA.test(service)) {
					return "DATA";
				} else {
					console.log("UNKNOWN SERVICE=", service);
					return "UNKOWN";
				}
			}
			
            function calcDuration(service, duration) {
                if (getService(service) === "SMS") {
                    return 1;
                } else if (getService(service) === "TEL") {
                    return (d3.time.format("%H:%M:%S").parse(duration).getTime() - d3.time.format("%H:%M:%S").parse("00:00:00").getTime()) / 1000;
                    /* hh:mm:ss --> seconds */
                } else {
                	return 0;
                }
            }
            
            function getDatavolume(service, datavolume) {
            	var result = 0;
            	if (getService(service) === "DATA") {
            		if (datavolume === undefined || datavolume === Number.NaN) {
            			result = 0;
            		}
            		result = parseInt(datavolume.replace(".", ""));
            	} 
            	return result;
            }
            
            function getReceiver(service, receiver) {
            	if (getService(service) === "DATA") {
            		return "T-MOBILE";
            	} else if (getService(service) === "SMS") {
            		return receiver;
            	} else {
            		return "UNKOWN RECEIVER";
            	}
            }
            
			for (var i = 0; i < lines.length; i++)
			{
				if (lines[i].length == 1 && /Rufnummer: .+/.test(lines[i])) {
					getFrom(lines[i]);
				} else if (lines[i].length == relevantLineLength[0] && d3.time.format("%d.%m.%Y").parse(lines[i][mappingTEL.date]) != null) {
					global.pushLine(result, // resultArray
							from, // from 
							global.normalizePhoneNumber(lines[i][mappingTEL.to]), // to 
							"TEL", // service
							d3.time.format("%Y-%m-%d")(d3.time.format("%d.%m.%Y").parse(lines[i][mappingTEL.date])), // date
							lines[i][mappingSMSDATA.time], // time
							calcDuration("TEL", lines[i][mappingTEL.duration]), // duration
							0, // upload
							0, // download
							fileName); // source filename
				} else if (lines[i].length == relevantLineLength[1] && d3.time.format("%d.%m.%Y").parse(lines[i][mappingSMSDATA.date]) != null) {
					global.pushLine(result, // resultArray
							from, // from 
							((getService(lines[i][mappingSMSDATA.service]) == "SMS")?  
									global.normalizePhoneNumber(lines[i][mappingSMSDATA.to]) : getReceiver(lines[i][mappingSMSDATA.service], lines[i][mappingSMSDATA.to])), // to 
							getService(lines[i][mappingSMSDATA.service]), // service
							d3.time.format("%Y-%m-%d")(d3.time.format("%d.%m.%Y").parse(lines[i][mappingSMSDATA.date])), // date
							lines[i][mappingSMSDATA.time], // time
							calcDuration(lines[i][mappingSMSDATA.service], 0), // duration
							getDatavolume(lines[i][mappingSMSDATA.service], lines[i][mappingSMSDATA.upload]), // upload
							getDatavolume(lines[i][mappingSMSDATA.service], lines[i][mappingSMSDATA.download]), // download
							fileName); // source filename					
				}
			} // end for
			return result;
		},
		/*
		 * P A R S E    S Q L I T E     D B
		 */
		parseSQLiteDB : function (fileName, fileContent) {
			var result = new Array();
			
			// Workaround for depreciation of FileReader.readAsBinaryString
			var binary = "";
			var bytes = new Uint8Array(fileContent);
			var length = bytes.byteLength;
			for (var i = 0; i < length; i++) {
			  binary += String.fromCharCode(bytes[i]);
			}
			// Open a database with binary string
			var db = SQL.open(binary);
		    
		    try {
		        var data = db.exec("select key_remote_jid as 'to', length(data) as volume, timestamp from messages where key_from_me = 1 and media_mime_type is null;");
//		        console.log(JSON.stringify(data, null, '  '));
//		        console.log("SQLite data=", data);
		        
		        data.forEach(function(d) {
		        	global.pushLine(result, // resultArray
		        			"MY PHONE", // from 
		        			global.normalizePhoneNumber((d[0]["value"]).substr(0, (d[0]["value"]).indexOf("@"))), // to 
							"WHATSAPP", // service
							d3.time.format("%Y-%m-%d")(new Date(Number(d[2]["value"]))), // date
							d3.time.format("%H-%M")(new Date(Number(d[2]["value"]))), // time
							d[1]["value"], // duration
							0, // upload
							0, // download
							fileName); // source filename
		        	
		        }); // for each
		        return result;
		        
		      } catch(e) {
		        console.log("parseSQLITEDB ", e);
		      }
		},
		
		parseFile : function(file, inputFormat) {
            var deferred = $q.defer(); // promise
            console.log("start parsing file ", file.name);
            var fileReader = new FileReader();

			fileReader.onload = function(e) {
				var content = {};
				if (inputFormat) {
					
					if (inputFormat == "sqlite") { // sqlite --> binary
						content = global.parseSQLiteDB(file.name, fileReader.result);
					} // end sqlite
					else if (inputFormat == "pdfDrei") {
						content = global.parseDreiPdfFile(file.name, fileReader.result);
					} // end if dreiPdf
					else if (inputFormat == "pdfA1") {
						content = global.parseA1PdfFile(file.name, fileReader.result);
					} // end if dreiPdf
					else { // CSV --> text
						var csv = fileReader.result;
						// \r\n == windows style; \n == unix style line breaks
						var allTextLines = csv.split(/\r\n|\n/); // extract lines
						var lines = [];
						for (var i = 0; i < allTextLines.length; i++) {
							var columns = allTextLines[i].split(';'); // extract columns
							var line = [];
							for (var j = 0; j < columns.length; j++) {
								line.push(columns[j]);
							}
							lines.push(line);
						}
						if (inputFormat == "csvBOB") {
							content = global.parseBobFile(file.name, lines);
						} else if (inputFormat == "csvTMOB") {
							content = global.parseTMobileFile(file.name, lines);
						} else if (inputFormat == "csvYES") {
							content = global.parseYesFile(file.name, lines);
						} else if (inputFormat == "csvTELERING") {
							content = global.parseTeleringFile(file.name, lines);
						}
						
					} // end CSV
					
					
				} // end if !undefined
				deferred.resolve(content);
			};
			fileReader.onerror = function(e) {
				deferred.reject();
			}
			if (inputFormat !== undefined) {
				if (inputFormat == "sqlite" || inputFormat == "pdfDrei" || inputFormat == "pdfA1") {
					fileReader.readAsArrayBuffer(file); // readAsBinaryString depreciated
				} else {
					fileReader.readAsText(file);
				}
			}
			return deferred.promise;
		} // end parsefile
		
	}; // global
	return global;
});






app.factory('DbFactory', function($window, $q) {
  var indexedDB = $window.indexedDB || $window.mozIndexedDB || $window.webkitIndexedDB || $window.msIndexedDB;
  var db = null;
  
  indexedDB.onerror = function(e) {
	console.log("indexedDB.onerror=", e);
  }
	
  /* Open Database metadataDB */
  var openDatabase = function(){
    var deferred = $q.defer(); // promise
    var version = 1;
    var request = indexedDB.open("metadataDB", version);
  
    /*ONUPGRADENEEDED*/
    request.onupgradeneeded = function(e) {
    	console.log("openDatabase.onupgradeneeded");
      db = e.target.result;
  
      e.target.transaction.onerror = indexedDB.onerror;
  
      if(db.objectStoreNames.contains("metadata")) {
        db.deleteObjectStore("metadata");
      }
  
      var store = db.createObjectStore("metadata",
        {keyPath: "id", autoIncrement: true});
      
      store.createIndex("from", "from", { unique:false });
      store.createIndex("to", "to", { unique:false });
      store.createIndex("date", "date", { unique:false });
      store.createIndex("time", "time", { unique:false });
      store.createIndex("timestamp", "timestamp", { unique:false });
      store.createIndex("duration", "duration", { unique:false });
      store.createIndex("service", "service", { unique:false });
      store.createIndex("source", "source", { unique:false });
      
    };
  
    /*ONSUCCESS*/
    request.onsuccess = function(e) {
//    	console.log("openDatabase.onsuccess");
      db = e.target.result;
      deferred.resolve();
    };
  
    /*ONERROR*/
    request.onerror = function(){
    	console.log("openDatabase.onerror");
      deferred.reject();
    };
    
    return deferred.promise;
  };
  
  
  
  /* select data from db */
  var selectData = function(){
    var deferred = $q.defer();
    
    if(db === null){
      deferred.reject("IndexDB is not opened yet!");
    }
    else{
      var trans = db.transaction(["metadata"], "readonly");
      var store = trans.objectStore("metadata");
      var returnValue = [];
    
      // Get everything in the store;
//      var keyRange = IDBKeyRange.lowerBound(0);
//      var cursorRequest = store.openCursor(keyRange);
      var cursorRequest = store.openCursor();
      
      cursorRequest.onsuccess = function(e) {
        var result = e.target.result;
        if(result === null || result === undefined)
        {
          deferred.resolve(returnValue);
        }
        else{
          returnValue.push(result.value);
          result.continue();
        }
      };
    
      cursorRequest.onerror = function(e){
        console.log(e.value);
        deferred.reject("Error selecting items!");
      };
    }

    return deferred.promise;
  };



  
  /* delete data from db */
  var deleteData = function(id){
    var deferred = $q.defer();
    
    if(db === null){
      deferred.reject("IndexDB is not opened yet!");
    }
    else{
      var trans = db.transaction(["metadata"], "readwrite");
      var store = trans.objectStore("metadata");
    
      var request = store.delete(id);
    
      request.onsuccess = function(e) {
        deferred.resolve();
      };
    
      request.onerror = function(e) {
        console.log(e.value);
        deferred.reject("Error deleting items");
      };
    }
    
    return deferred.promise;
  };
  
  
  /* store data in db */
  var insertData = function(data){
    var deferred = $q.defer();
    
    if(db === null){
    	console.log("insertData.db===null")
    	deferred.reject("IndexDB is not opened yet!");      
    }
    else{
      var trans = db.transaction(["metadata"], "readwrite");
      var store = trans.objectStore("metadata");
      var request = 0;
      
      if (angular.isArray(data)) {
    	  angular.forEach(data, function(item) {
//              console.log("insertData() ", item);
    		  request = store.put(item);  
    	  });
      }
      else {
    	  console.log("not an array", data);
      }
    
      request.onsuccess = function(e) {
    	  console.log("insertData.onsuccess", e);
    	  deferred.resolve();
      };
    
      request.onerror = function(e) {
    	  console.log("insertData.onerror", e)
    	  deferred.reject("Error adding items!");
      };
    }
    return deferred.promise;
  };
  
  
  
  
  /* delete all from db */
  var resetDatabase = function(id){
    var deferred = $q.defer();
    
    if(db === null){
      deferred.reject("IndexDB is not opened yet!");
    }
    else{
		var trans = db.transaction(["metadata"], "readwrite");
		var store = trans.objectStore("metadata");
		var request = store.clear();
//      if(db.objectStoreNames.contains("metadata")) {
//          db.deleteObjectStore("metadata");
//        }
    
      request.onsuccess = function(e) {
//    	  console.log("resetDatabase.onsuccess");
        deferred.resolve();
      };
    
      request.onerror = function(e) {
    	  console.log("resetDatabase.onerror", e);
        deferred.reject("Error reseting database");
      };
    }
    
    return deferred.promise;
  };
  
  
  
  return {
    openDatabase: openDatabase,
    resetDatabase: resetDatabase,
    selectData: selectData,
    insertData: insertData,
    deleteData: deleteData
  };

});