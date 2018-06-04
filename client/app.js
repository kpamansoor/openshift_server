var app = angular.module('server', ['ngRoute']);
// app.config(function ($routeProvider) {
//     $routeProvider.when('/', {
//             templateUrl: 'templates/calculate.html',
//             controller: 'calculateController'
//         })
//         .when('/home', {
//             templateUrl: 'app/templates/home.html',
//             controller: 'homeController'
//         });
// });

app.controller('senderController', function ($scope, $rootScope, $http, Config,$timeout) {

    $scope.loading = false;
    $scope.title = "";
    $scope.message = "";
    $scope.buttonText ="Send Now";
    $scope.response ="";

    $scope.sendNotification = function () {
        
        if (validate()) {
            var txt;
            var r = confirm("Confirm to broadcast!");
            if (r == true) {
                $scope.loading = true;
                $scope.buttonText = "Sending...";
                var params = 'title='+$scope.title+
                                '&message='+$scope.message;            
    
                var config = {
                    headers: {}
                }
                $http.get(Config.server_url + 'sendNotification?'+params, config)
                    .success(function (data, status, headers, config) {
                        $scope.title = "";
                        $scope.message = "";
                        $scope.buttonText = "Succesfully send!"
                        $scope.response = JSON.stringify(data);
                        $timeout( function(){
                            $scope.buttonText ="Send Now";
                            $scope.response ="";
                        }, 3000 );
                       
                    })
                    .error(function (data, status, header, config) {
    
                    });
            } else {
                // txt = "You pressed Cancel!";
            }
           
        }

    }

    validate = function () {

        valid = true;

        if ($scope.title.length <= 0) {
            document.getElementById('title').style.borderColor = "red";
            valid = valid && false;
        } else
            document.getElementById('title').style.borderColor = "rgba(255, 255, 255, 0.4)";



        if ($scope.message.length <= 0) {
            document.getElementById('message').style.borderColor = "red";
            valid = valid && false;
        } else
            document.getElementById('message').style.borderColor = "rgba(255, 255, 255, 0.4)";

        return valid;
    }
   
});
