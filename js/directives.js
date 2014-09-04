'use strict';

/* Directives */
var app = angular.module('mcApp.directives', []);

app.directive('barChart', function() {
    var chart = d3.custom.barChart();
    return {
        restrict: 'E',
        replace: true,
        scope:{
            data: "=",
            service: "="            	
        },
        template: '<div class="chart"></div>',
        link: function(scope, element, attrs) {
        	
            var chartEl = d3.select(element[0]);

            scope.$watch('data', function (newVal, oldVal) {
            	console.log("directive.barChart: data changed");
            	if (newVal !== undefined) {
            		chartEl.datum({data: newVal, service: attrs.service}).call(chart);
            	}
            });

        } // end function
    	}; // end return
	});

app.directive('streamGraph', function() {
    var chart = d3.custom.streamGraph();
    return {
        restrict: 'E',
        replace: true,
        scope:{
            data: "=",
            service: "="            	
        },
        template: '<div class="chart"></div>',
        link: function(scope, element, attrs) {
        	
            var chartEl = d3.select(element[0]);

            scope.$watch('data', function (newVal, oldVal) {
            	console.log("directive.streamGraph: data changed");
            	if (newVal !== undefined) {
            		chartEl.datum({data: newVal, service: attrs.service}).call(chart);
            	}
            });

        }
    };
});

app.directive('forceGraph', function() {
    var chart = d3.custom.forceGraph();
    return {
        restrict: 'E',
        replace: true,
        scope:{
            data: "="
        },
        template: '<div class="chart"></div>',
        link: function(scope, element, attrs) {
        	
            var chartEl = d3.select(element[0]);

            scope.$watch('data', function (newVal, oldVal) {
            	console.log("directive.forceGraph: data changed");
            	if (newVal !== undefined) {
            		chartEl.datum({data: newVal}).call(chart);
            	}
            });

        }
    };
});



