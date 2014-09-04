d3.custom = {};

d3.custom.barChart = function module() {
    var margin = {top: 20, right: 20, bottom: 100, left: 50},
        width = 960,
        height = 500,
        gap = 0,
        ease = 'cubic-in-out';
    var duration = 500;

    var dispatch = d3.dispatch('customHover');
    function exports(_selection) {
        _selection.each(function(_data) {

        	var data = _data["data"];
        	var service = _data["service"];
//        	console.log("service=", _data["service"]);
        	var svg = d3.select("#barChart"+service); // prevent reinitialisation of chart
//        	console.log("svg=", svg[0][0] != null);
        	
            var nested_data = d3.nest() // nest the data according to [date] and sum up service duration
                .key(function(d) { return d.date; }).sortKeys(d3.ascending)
                .key(function(d) { return d.service; })
                .rollup(function(d) {
                    return d3.sum(d, function(g) {
                    	if (service == "DATA") {
                    		return g.datavolume;
                    	} else if (service == "TEL" || service == "SMS") {
                    		return g.duration;
                    	} else if (service == "WHATSAPP") {
                    		return g.duration;
                    	}                    	
                    })
                })
                .entries(data);

            // rebuild array of objects
            nested_data.forEach(function(d) { // set default values
                d.date = d.key;
                d["TEL"] = 0; d["SMS"] = 0; d["DATA"] = 0; d["WHATSAPP"] = 0; // initialize properties
                d.values.forEach(function(e) {
                    if (typeof e.values === "number") {
                        d[e.key] = e.values;
                    } else {
                        d[e.key] = 0;
                    }
                });
                delete(d.key);
                delete(d.values);
            });

//            console.log("reusableBarChart.nestedData=", nested_data);

            var chartW = width - margin.left - margin.right,
                chartH = height - margin.top - margin.bottom;

            var parseDate = d3.time.format("%Y-%m-%d").parse;

            var x1 = d3.scale.ordinal()
                .rangeRoundBands([0, chartW], .05);

            var y1 = d3.scale.linear()
                .domain([0, d3.max(nested_data, function(d, i){ return d; })])
                .range([chartH, 0]);

            var xAxis = d3.svg.axis()
                .scale(x1)
                .orient("bottom")
                .ticks(50)
                .tickFormat(d3.time.format("%Y-%m-%d"));

            var yAxis = d3.svg.axis()
                .scale(y1)
                .orient('left');

            x1.domain(nested_data.map( function(d) {
                return parseDate(d.date);
            }));

            var ydomain = [];
            nested_data.forEach(function(element, index, array) {
                ydomain.push(element[service]);
            });

            y1.domain([0, d3.max(ydomain)]);

            var barW = chartW / nested_data.length;

            var tooltip = d3.select("#BCtooltip" + service);
            
            
            if(svg[0][0] == null) {
                svg = d3.select(this)
                    .append('svg')
                    .classed('chart', true)
                    .attr("id", "barChart"+service);
                var container = svg.append('g').classed('container-group', true);
                container.append('g').classed('chart-group', true);
                container.append('g').classed('x-axis-group axis', true);
                container.append('g').classed('y-axis-group axis', true);
            }

            svg.transition().duration(duration).attr({width: width, height: height});
            svg.select('.container-group').attr({transform: 'translate(' + margin.left + ',' + margin.top + ')'});

            svg.select('.x-axis-group.axis')
                .transition()
                .duration(duration)
                .ease(ease)
                .attr({transform: 'translate(0,' + (chartH) + ')'})
                .call(xAxis)
                .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", "-.55em")
                .attr("transform", "rotate(-90)" );

            svg.select('.y-axis-group.axis')
                .transition()
                .duration(duration)
                .ease(ease)
                .call(yAxis);

            var gapSize = x1.rangeBand() / 100 * gap; // gap size = 1/100 der Breite eines Balken
            var barW = x1.rangeBand() - gapSize; // Breite eines Balken = rangeBand - gap size

            var bars = svg.select('.chart-group')
                .selectAll('.bar')
                .data(nested_data);

            bars.enter()
                .append('rect')
                    .classed('bar', true)
                    .attr({x: chartW,
                        width: barW,
                        y: function(d) { return y1(d[service]); },
                        height: function(d) { return chartH - y1(d[service]); }
                    })
                .append("svg:title")
                    .text(function(d, i) {
                        return service + " " + d[service];
                    });

            bars.transition()
                .duration(duration)
                .ease(ease)
                .attr({
                    width: barW,
                    x: function(d) { return x1(parseDate(d.date)) + gapSize/2; },
                    y: function(d) { return y1(d[service]); },
                    height: function(d) { return chartH - y1(d[service]); }
                });
            bars.exit().transition().style({opacity: 0}).remove();


           
            
            bars.on('mouseover', function(d){
            	if (service == "TEL") {
	            	var date1 = new Date(d[service] * 1000);
	            	var date2 = new Date(0);
	            	var offset = date1.getTimezoneOffset() *60000;
	            	var date = new Date(date1.getTime() - date2.getTime() + offset);
	            	var format = d3.time.format("%H:%M:%S");
	            	tooltip.html("<p>Date: " + d["date"] + "<br/>Duration: " + format(date) +"</p>").style("visibility", "visible");
            	} else if (service == "SMS") {
            		tooltip.html("<p>Date: " + d["date"] + "<br/># Messages: " + d[service] +"</p>").style("visibility", "visible");
            	} else if (service == "WHATSAPP") {
            		tooltip.html("<p>Date: " + d["date"] + "<br/># Characters: " + d[service] +"</p>").style("visibility", "visible");
            	} else if (service == "DATA") {
            		tooltip.html("<p>Date: " + d["date"] + "<br/>Datavolume: " + d3.format(",f")(d[service]).replace(",", ".") +" KB</p>").style("visibility", "visible");
            	}
            });
            bars.on('mouseout', function(d){ 
            	tooltip.html("<p>&nbsp;<br/>&nbsp;</p>").style("visibility", "hidden"); 
            });
            
            duration = 500;

        });
    }
    exports.width = function(_x) {
        if (!arguments.length) return width;
        width = parseInt(_x);
        return this;
    };
    exports.height = function(_x) {
        if (!arguments.length) return height;
        height = parseInt(_x);
        duration = 0;
        return this;
    };
    exports.gap = function(_x) {
        if (!arguments.length) return gap;
        gap = _x;
        return this;
    };
    exports.ease = function(_x) {
        if (!arguments.length) return ease;
        ease = _x;
        return this;
    };
    return exports;
};