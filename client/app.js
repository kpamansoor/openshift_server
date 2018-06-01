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

app.controller('senderController', function ($scope, $rootScope, $http, Config) {

    $scope.loading = false;
    $scope.title = "";
    $scope.message = "";
    $scope.buttonText ="Send Now";
    $scope.response ="";

    $scope.sendNotification = function () {
        if (validate()) {
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
                })
                .error(function (data, status, header, config) {

                });
        }

    }

    validate = function () {

        valid = true;

        if ($scope.title.length <= 0) {
            document.getElementById('title').style.borderColor = "red";
            valid = valid && false;
        } else
            document.getElementById('title').style.borderColor = "green";



        if ($scope.message.length <= 0) {
            document.getElementById('message').style.borderColor = "red";
            valid = valid && false;
        } else
            document.getElementById('message').style.borderColor = "green";

        return valid;
    }
   
});
