'use strict';

/* Controllers */

angular.module('mcApp.controllers', [])
  
.controller('UploadSourceController', function($scope, ParseFactory, DbFactory, SharedDataFactory) {
	var dropbox = document.getElementById("dropbox");
    $scope.dropText = "Drop files here...";


    // init event handlers
    function dragEnterLeave(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        $scope.$apply(function(){
            $scope.dropText = "Drop files here...";
            $scope.dropClass = "";
        });
    }
    dropbox.addEventListener("dragenter", dragEnterLeave, false);
    dropbox.addEventListener("dragleave", dragEnterLeave, false);
    
    dropbox.addEventListener("dragover", function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        var clazz = 'not-available';
        var ok = evt.dataTransfer && evt.dataTransfer.types && evt.dataTransfer.types.contains('Files') >= 0; // WG indexOf() --> contains()
        $scope.$apply(function(){
            $scope.dropText = ok ? 'Drop files here...' : 'Only files are allowed!';
            $scope.dropClass = ok ? 'over' : clazz;
        });
    }, false);
    
    dropbox.addEventListener("drop", function(evt) {
        console.log('drop evt:', JSON.parse(JSON.stringify(evt.dataTransfer)));
        evt.stopPropagation();
        evt.preventDefault();
        $scope.$apply(function(){
            $scope.dropText = 'Drop files here...';
            $scope.dropClass = '';
        });
        var files = evt.dataTransfer.files;
        if (files.length > 0) {
            $scope.$apply(function(){
                $scope.files = [];
                for (var i = 0; i < files.length; i++) {
                    $scope.files.push(files[i]);
                }
            });
        }
    }, false);
    //============== DRAG & DROP =============

    $scope.files = [];
    $scope.setFiles = function(element) {
        $scope.$apply(function(scope) {
          console.log('files:', element.files);
          // Turn the FileList object into an Array
            scope.files = [];
            for (var i = 0; i < element.files.length; i++) {
              scope.files.push(element.files[i]);
            }
          });
    };

    $scope.getFiles = function() {
        return SharedDataFactory.getAvailableSources();
    };

    $scope.showSuccess = false;
    $scope.showError = false;
    
    $scope.filesFinished = 0;
    $scope.filesLength = 0;
    
    $scope.getProgress = function() {
    	if ($scope.filesFinished == 0 || $scope.filesLength == 0) {
    		return 0; 
    	} else {
    	   	return Math.round($scope.filesFinished/$scope.filesLength*100);
    	}
    };
    
    
    // ========== PARSE FILES =========
    $scope.processFiles = function() {
    	$scope.disableBtn = false;
    	$scope.showSuccess = false;
        $scope.showError = false;
    
        $scope.filesFinished = 0;
        $scope.filesLength = $scope.files.length;
        
    	if ($scope.files && $scope.files.length > 0)
    	{
            console.log("processFiles()=", $scope.files);
    		DbFactory.openDatabase().then(function() {
                for (var i in $scope.files) {
             
                    ParseFactory.parseFile($scope.files[i], $scope.inputFormat).then(
                        function (resultParse) {
                            console.log("parse successful ", resultParse.length);
                            
                            if (resultParse !== undefined && resultParse.length > 0) {
	                            DbFactory.insertData(resultParse).then(
	                                function (resultInsert) {
	//    									console.log("insert successful ", resultInsert);
	                                    console.log("insert successful", resultInsert);
	                                    $scope.filesFinished++; // for progress bar
	                                    console.log(i + " processing file ", $scope.files[i].name, " format=", $scope.inputFormat);
	                                   
	                                    if ($scope.filesFinished == $scope.filesLength) { // execute select after last insert
	                                    	$scope.files = [];
	                                    	
		                                    DbFactory.selectData().then(
		                                        function (resultSelect) {
		    					                    console.log("select successful ", resultSelect.length);
		                                            SharedDataFactory.setDatabaseValues(resultSelect); // set Datavalues
		
		                                            var sources = d3.set(SharedDataFactory.getAvailableSources());
		                                            resultSelect.forEach(function(d) {
		                                                sources.add(d.source);
		                                            });
		                                            SharedDataFactory.setAvailableSources(sources.values()); // set Source Filenames
		                                            
		                                            $scope.showSuccess = true;
		                                            $scope.showError = false;
		                                            
		                                        }, function (resultSelect) {
		                                            console.log("select failed ", resultSelect);
		                                        }); // selectData
	                                    }
	
	                                }, function (resultInsert) {
	                                    console.log("insert failed ", resultInsert);
	                                    $scope.showSuccess = false;
	                                    $scope.showError = true;
	                                }
	                            ); // insertData
                            } // end if resultParse > 0
                        }, function (resultParse) {
                            console.log("parse failed ", resultParse);
                            $scope.showSuccess = false;
                            $scope.showError = true;
                        }); // parsefile
                    console.log("processFiles: bottom");
                } // end for loop
            }); // open Database
    	} // end if
    };
    
    $scope.resetDatabase = function() {
    	DbFactory.openDatabase().then(
    			function(){ 
    				DbFactory.resetDatabase().then(
    						function (resultReset) {
//    							console.log("resetDatabase successful");
    						}, function (resultReset) {
    							console.log("resetDatabase failed");
    						}
    						); 
    				});
	};
	
	$scope.$watch("inputFormat", function (newVal, oldVal) {
//    	console.log("UploadController.inputFormat: data changed");
    	SharedDataFactory.setInputFormat(newVal);
    });

	$scope.resetDatabase();
	$scope.disableBtn = false;

    
}) // end module controller UploadSourceController
  
  



.controller('VisualisationController', function($scope, SharedDataFactory) {
	$scope.data = [];
	$scope.inputFormat = undefined;
	
	 $scope.toggleFullscreen = function() {
//	    	console.log("toggleFullscreen");
	    	if (d3.select("#left").classed("hidden")) { // to small
	    		d3.select("#left").classed("hidden", false);
	    		d3.select("ul.nav").classed("hidden", false);
	    		d3.select("#right").classed("col-md-12", false);
	    		d3.select("#right").classed("col-md-8", true);
	    		d3.select("#btnFGFS").select("span").classed("glyphicon-resize-full", true);
	    		d3.select("#btnFGFS").select("span").classed("glyphicon-resize-small", false);
	    	} else { // to full
	    		d3.select("#left").classed("hidden", true);
	    		d3.select("ul.nav").classed("hidden", true);
	    		d3.select("#right").classed("col-md-12", true);
	    		d3.select("#right").classed("col-md-8", false);
	    		d3.select("#btnFGFS").select("span").classed("glyphicon-resize-full", false);
	    		d3.select("#btnFGFS").select("span").classed("glyphicon-resize-small", true);
	    	}
	    	d3.select("#right")[0][0].dispatchEvent(new CustomEvent("customResize", {}));
	 };
	    
	$scope.$watch(function() { return SharedDataFactory.getInputFormat(); }, function (newVal, oldVal) {
//	      console.log("VisualisationController.inputFormat changed (oldVal, newVal)", oldVal, newVal);
	      $scope.inputFormat = SharedDataFactory.getInputFormat();
	    });
	
	
	$scope.$watch(function() { return SharedDataFactory.getAvailableSources(); }, function (newVal, oldVal) {
//	      console.log("VisualisationController.dbData changed (oldVal, newVal)", oldVal, newVal);
	      $scope.data = SharedDataFactory.getDatabaseValues();
	    });
});




