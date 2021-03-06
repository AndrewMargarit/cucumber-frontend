'use strict';

var app = angular.module('myApp.charts.directives', []);

app.directive('clientsChart', ['$timeout', '$rootScope', function($timeout, $rootScope) {

  var link = function(scope,element,attrs,controller) {

    var chart, d, json, len, formatter, i, time, title, data, timer, options;

    function toTitleCase(str) {
      return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }

    controller.$scope.$on('clientIndexChart', function(val,obj) {
      init(obj);
    });

    $(window).resize(function() {
      if (this.resizeTO) {
        clearTimeout(this.resizeTO);
      }
      this.resizeTO = setTimeout(function() {
        $(this).trigger('resizeEnd');
      }, 500);
    });

    $(window).on('resizeEnd', function() {
      drawChart();
    });

    function init(obj) {

      // if (obj) {
      scope.fn = obj.fn;
      scope.type = obj.type;
      json = obj.data;
      // }

      timer = $timeout(function() {
        drawChart();
      },250);
    }

    var clearChart = function() {
      if (chart) {
        chart.clearChart();
      }
    };

    function drawChart() {

      $timeout.cancel(timer);
      data = new window.google.visualization.DataTable();

      data.addColumn('datetime', 'Date');
      data.addColumn('number', 'dummySeries');

      options = {
        lineWidth: 1.5,
        legend: { position: 'none' },
        crosshair: {
          trigger: 'both',
          orientation: 'vertical'
        },
        focusTarget: 'category',
        fontName: 'roboto',
        explorer: {
          axis: 'horizontal',
          actions: [ 'dragToZoom', 'rightClickToReset'],
        },
        chartArea: {
          left: '2%',
          // right: '2%',
          top: '3%',
          height: '84%',
          width: '94%'
        },
        colors: ['#009688', '#009688', '#FF5722', '#03A9F4', '#FF5722', '#607D8B'],
        series: {
          0: {
            targetAxisIndex: 0, visibleInLegend: false, pointSize: 0, lineWidth: 0
          },
          1: {
            targetAxisIndex: 1
          },
          2: {
            targetAxisIndex: 1
          }
        },
        vAxes: {
          0: {
            textPosition: 'none'
          },
          1: {
            // title: title,
          },
        }
      };

      if (scope.type === 'signal') {
        signalChart();
      } else if (scope.type === 'failures') {
        failureChart();
      } else if (scope.type === 'mcs') {
        mcsChart();
      } else {
        txChart();
      }

      if (!scope.noData) {
        chart = new window.google.visualization.LineChart(document.getElementById('clients-chart'));
        chart.draw(data, options);
      }
    }

    var signalChart = function() {

      title = toTitleCase(scope.fn || 'Mean') + ' Signal Strength';
      data.addColumn('number', 'SNR');
      data.addColumn('number', 'Signal');
      data.addColumn('number', 'Noise');

      if (json.signal && json.signal.length) {

        len = json.signal.length;

        for(i = 0; i < len; i++) {
          time = new Date(json.signal[i].time / (1000*1000));
          var snr = 0, noise = 0, signal = 0;
          if (json.signal && json.signal[i] && json.signal[i].value) {
            signal = json.signal[i].value;
          }
          if (json.snr && json.snr[i] && json.snr[i].value) {
            snr = json.snr[i].value;
          }
          if (json.noise && json.noise[i] && json.noise[i].value) {
            noise = json.noise[i].value;
          }
          data.addRow([time, null, snr, signal, noise ]);
        }

        formatter = new window.google.visualization.NumberFormat(
          {suffix: 'dB', negativeColor: 'red', negativeParens: true, pattern: '0'}
        );
        formatter.format(data,1);
        formatter = new window.google.visualization.NumberFormat(
          {suffix: 'dBm', negativeColor: 'red', negativeParens: true, pattern: '0'}
        );
        formatter.format(data,2);
        formatter.format(data,3);
        formatter.format(data,4);

        options.vAxis = {
          viewWindowMode:'explicit',
          viewWindow:{
            min: -100,
            max: 100
          }
        };
      } else {
        scope.noData = true;
        scope.loading = undefined;
        clearChart();
      }
    };

    var failureChart = function() {
      title = toTitleCase(scope.fn || 'Mean') + 'Transmission Failures';
      data.addColumn('number', 'TX Failed');

      if (json && json.txfailed && json.txfailed.length) {
        len = json.txfailed.length;
        for(i = 0; i < len; i++) {
          time = new Date(json.txfailed[i].time / (1000*1000));
          data.addRow([time, null, json.txfailed[i].value]);
        }
        formatter = new window.google.visualization.NumberFormat(
          {pattern: '0'}
        );
        formatter.format(data,1);
      } else {
        scope.noData = true;
        scope.loading = undefined;
        clearChart();
      }
    };

    var mcsChart = function() {
      title = toTitleCase(scope.fn || 'Mean') + 'MCS Values';
      data.addColumn('number', 'MCS Index');
      if (json.mcs && json.mcs.length) {
        len = json.mcs.length;
        for(i = 0; i < len; i++) {
          var mcs = json.mcs[i].value;
          if (!mcs) {
            mcs = 0;
          }
          time = new Date(json.mcs[i].time / (1000*1000));
          data.addRow([time, null, mcs]);
        }
        formatter = new window.google.visualization.NumberFormat(
          { pattern: '0' }
        );
        formatter.format(data,1);
      } else {
        scope.noData = true;
        scope.loading = undefined;
        clearChart();
      }
    };

    var txChart = function() {
      var suffix = 'Mbps';
      var type = 'Traffic';
      if (scope.type === 'usage') {
        type = 'Usage';
        suffix = 'MiB';
      }

      title = toTitleCase(scope.fn || 'Mean') + ' ' + type + ' (' + suffix + ')';

      data.addColumn('number', 'Inbound');
      data.addColumn('number', 'Outbound');

      if (json && json.inbound && json.inbound.length) {
        len = json.inbound.length;
        for(i = 0; i < len; i++) {

          var outbound = 0;
          var inbound = json.inbound[i].value;
          time = new Date(json.inbound[i].time / (1000*1000));

          if (json.outbound && json.outbound[i] && json.outbound[i].value) {
            outbound = json.outbound[i].value;
          }

          if (scope.type === 'usage') {
            data.addRow([time, null, inbound / (1000*1000), outbound / (1000*1000) ]);
          } else {
            data.addRow([time, null, inbound / (1000*1000), outbound / (1000*1000)]);
          }
        }
        formatter = new window.google.visualization.NumberFormat(
          {suffix: suffix, pattern: '0'}
        );
        formatter.format(data,2);
        formatter.format(data,1);
      } else {
        scope.noData = true;
        scope.loading = undefined;
        clearChart();
      }
    };

  };

  return {
    link: link,
    require: '^clientsIndex',
    scope: {
      json: '@',
      fn: '@',
      type: '@'
    },
    template:
      '<div id="clients-chart" layout="row" layout-align="left end"></div>'+
      '<md-progress-linear ng-if="loadingChart" md-mode="query"></md-progress-linear>'+
      '<div layout="row" ng-if=\'noData || loading\' style=\'min-height: 250px;\' layout-align="left end" class=\'muted\'>'+
      '<p><small><span ng-if=\'noData\'>No graph data</span><span ng-if=\'loading\'>Loading usage data</span></small></p>'+
      '</div>'
  };

}]);

app.directive('clientChart', ['Report', '$routeParams', '$q', 'ClientDetails', function(Report, $routeParams, $q, ClientDetails) {

  return {
    scope: {
      location: '@',
      mac: '@'
    },
    controller: function($scope,$element,$attrs) {

      $(window).resize(function() {
        if (this.resizeTO) {
          clearTimeout(this.resizeTO);
        }
        this.resizeTO = setTimeout(function() {
          $(this).trigger('resizeEnd');
        }, 500);
      });

      $(window).on('resizeEnd', function() {
        $scope.$broadcast('loadClientChart');
      });

      this.$scope = $scope;

      this.options = {
        lineWidth: 1.5,
        // legend: { position: 'none' },
        height: 250,
        focusTarget: 'category',
        // fontName: 'roboto',
        crosshair: {
          trigger: 'both',
          orientation: 'vertical'
        },
        chartArea: {
          left: '3%',
          top: '3%',
          height: '84%',
          width: '90%'
        },
        interpolateNulls: true,
        colors: ['#009688', '#009688', '#FF5722', '#03A9F4', '#FF5722', '#607D8B']
      };

      this.setInterval = function() {
        switch(this.period) {
          case '5m':
            this.interval = '10s';
            break;
          case '30m':
            this.interval = '1m';
            break;
          case '1d':
            this.interval = '30m';
            break;
          case '6h':
            this.interval = '180s';
            break;
          case '7d':
            this.interval = '1h';
            break;
          case '14d':
            this.interval = '1h';
            break;
          case '30d':
            this.interval = '1h';
            break;
          default:
            this.interval = '60s';
        }
      };

      this.getStats = function(params) {
        var deferred = $q.defer();
        this.period = params.period || $routeParams.period;
        this.setInterval();
        $scope.client = ClientDetails.client;
        Report.clientstats({
          type:         params.type,
          fill:         params.fill || $routeParams.fill,
          fn:           params.fn || $routeParams.fn,
          ap_mac:       $scope.client.ap_mac,
          client_mac:   $scope.client.client_mac,
          location_id:  $routeParams.id,
          resource:     params.resource,
          interval:     params.interval || this.interval,
          period:       this.period,
          start:        params.start,
          end:          params.end,
        }).$promise.then(function(data) {
          if (data.usage || data.timeline) {
            deferred.resolve(data);
          } else {
            deferred.reject();
          }
        }, function() {
          deferred.reject();
        });
        return deferred.promise;
      };
    }
  };

}]);

app.directive('txChart', ['$timeout', 'Report', '$routeParams', function($timeout, Report, $routeParams) {

  var link = function(scope,element,attrs,controller) {

    var c, timer;
    var opts = controller.options;

    scope.type     = 'tx';
    scope.loading  = true;
    scope.fn       = 'mean';
    scope.resource = 'client';

    controller.$scope.$on('loadClientChart', function (evt,type){
      if (type && type === 'device') {
         scope.resource = 'device';
      }
      chart();
    });

    scope.changeFn = function(type) {
      controller.fn = type;
      scope.fn = type;
      chart();
    };

    scope.changeTxType = function(t) {
      scope.type = t;
      chart(scope.type);
    };

    scope.refresh = function() {
      chart();
    };

    scope.fullScreen = function(type) {
      var t = { panel: type };
      if (!scope.fs) {
        scope.fs = true;
        controller.$scope.$broadcast('fullScreen', t);
      } else {
        scope.fs = undefined;
        controller.$scope.$broadcast('closeFullScreen', t);
      }
    };

    function chart() {
      var params = {
        type: scope.type,
        resource: scope.resource,
        fn: scope.fn
      };
      controller.getStats(params).then(function(data) {
        timer = $timeout(function() {
          drawChart(data.timeline);
        },500);
      }, function() {
        scope.noData = true;
        scope.loading = undefined;
        clearChart();
      });
    }

    var clearChart = function() {
      if (c) {
        c.clearChart();
      }
    };

    function drawChart(json) {

      $timeout.cancel(timer);
      var len, time, suffix;

      if (json.txfailed || json.txretries || json.inbound) {

        if (scope.type === 'usage') {
          scope.title = 'WiFi Usage';
          suffix = 'MB';
        } else if (scope.resource === 'device') {
          scope.title = 'Device Traffic (Mbps)';
          suffix = 'Mbps';
        } else if (scope.type === 'tx') {
          scope.title = 'WiFi Traffic (Mbps)';
          suffix = 'Mbps';
        } else if (scope.type === 'txfailed') {
          scope.title = 'Failed Tx Count';
          suffix = undefined;
        } else if (scope.type === 'txretries') {
          scope.title = 'Tx Retries';
          suffix = undefined;
        }

        var data = new window.google.visualization.DataTable();
        data.addColumn('datetime', 'Date');
        data.addColumn('number', 'dummySeries');

        if (scope.type === 'device_tx' || scope.type === 'tx' || scope.type === 'usage') {
          len = json.inbound.length;
          data.addColumn('number', 'Inbound');
          data.addColumn('number', 'Outbound');
        } else if (scope.type === 'txfailed') {
          len = json.txfailed.length;
          data.addColumn('number', 'Tx Failed');
        } else if (scope.type === 'txretries') {
          len = json.txretries.length;
          data.addColumn('number', 'Tx Retries');
        }

        for(var i = 0; i < len; i++) {

          if (scope.type === 'device_tx' || scope.type === 'tx' || scope.type === 'usage') {

            var outbound = 0;
            var inbound = json.inbound[i].value;
            time = new Date(json.inbound[i].time / (1000*1000));

            if (json.outbound && json.outbound[i] && json.outbound[i].value) {
              outbound = json.outbound[i].value;
            }

            data.addRow([time, null, inbound / (1000*1000), outbound / (1000*1000) ]);

          } else if (scope.type === 'txfailed') {

            time = new Date(json.txfailed[i].time / (1000*1000));
            var val = 0;
            if (json.txfailed && json.txfailed[i] && json.txfailed[i].value) {
              val = json.txfailed[i].value;
            }
            data.addRow([time, null, val]);

          } else if (scope.type === 'txretries') {

            time = new Date(json.txretries[i].time / (1000*1000));
            data.addRow([time, null, json.txretries[i].value]);

          }
        }

        var formatter = new window.google.visualization.NumberFormat(
          {suffix: suffix}
        );
        formatter.format(data,2);
        if (scope.type === 'tx' || scope.type === 'usage' || scope.type === 'device_tx') {
          formatter.format(data,3);
        }

        opts.legend = { position: 'none' };
        opts.series = {
          0: {
            targetAxisIndex: 0, visibleInLegend: false, pointSize: 0, lineWidth: 0
          },
          1: {
            targetAxisIndex: 1
          },
          2: {
            targetAxisIndex: 1
          }
        };
        opts.vAxes = {
          0: {
            textPosition: 'none'
          },
          1: {},
        };

        opts.explorer = {
          maxZoomOut:2,
          keepInBounds: true,
          axis: 'horizontal',
          actions: [ 'dragToZoom', 'rightClickToReset'],
        };
        if (scope.fs) {
          opts.height = 600;
        } else {
          opts.height = 250;
        }
        c = new window.google.visualization.LineChart(document.getElementById('tx-chart'));
        c.draw(data, opts);
        scope.noData = undefined;
        scope.loading = undefined;
      } else {
        scope.noData = true;
        scope.loading = undefined;
        clearChart();
      }
    }
  };

  return {
    link: link,
    scope: {
      type: '@'
    },
    require: '^clientChart',
    template:
      '<md-card>'+
      '<md-card-header class="graph-small">'+
      '<md-card-header-text>'+
      '<span class="md-subhead">'+
      '{{ fn | titleCase }} {{ title }}'+
      '</span>'+
      '</md-card-header-text>'+
      // '<div flex></div>'+
      '<md-button class="md-icon-button" ng-if="fs" ng-click="fullScreen()">'+
      '<md-icon>fullscreen_exit</md-icon>'+
      '</md-button>'+
      '<md-button class="md-icon-button" ng-if="!fs" ng-click="fullScreen(\'tx\')">'+
      '<md-icon>fullscreen</md-icon>'+
      '</md-button>'+
      '<md-button class="md-icon-button" ng-click="refresh()">'+
      '<md-icon>refresh</md-icon>'+
      '</md-button>'+
      '<md-menu-bar style="padding: 0">'+
      '<md-menu>'+
      '<button ng-click="$mdOpenMenu()">'+
      '<md-icon>more_vert</md-icon>'+
      '</button>'+
      '<md-menu-content width="3">'+
      '<md-menu-item>'+
      '<md-button ng-click="changeTxType(\'tx\')">'+
      'WiFi Traffic'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeTxType(\'usage\')">'+
      'WiFi Usage'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item ng-if="resource != \'device\'">'+
      '<md-button ng-click="changeTxType(\'txfailed\')">'+
      'TX Fails'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item ng-if="resource != \'device\'">'+
      '<md-button ng-click="changeTxType(\'txretries\')">'+
      'TX Retries'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-divider></md-menu-divider>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeFn(\'mean\')">'+
      'Average Values'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeFn(\'max\')">'+
      'Max. Values'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeFn(\'median\')">'+
      'Median Values'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeFn(\'sum\')" ng-disabled="type == \'tx\'">'+
      'Sum'+
      '</md-button>'+
      '</md-menu-item>'+
      '</md-menu-content>'+
      '</md-menu>'+
      '</md-menu-bar>'+
      '</md-card-header>'+
      '<md-card-content>'+
      '<div id="tx-chart"></div>'+
      '<div>'+
      '<div layout="row" ng-if=\'noData || loading\' style=\'min-height: 250px;\' layout-align="left end" class=\'muted\'>'+
      '<p><small><span ng-if=\'noData\'>No graph data</span><span ng-if=\'loading\'>Loading usage data</span></small></p>'+
      '</div>'+
      '<md-progress-linear ng-if=\'loading\' md-mode="query"></md-progress-linear>'+
      '</div>'+
      '</md-card-content>'+
      '</md-card>'
  };

}]);

app.directive('usageChart', ['$timeout', 'Report', '$routeParams', function($timeout, Report, $routeParams) {

  var link = function(scope,element,attrs,controller) {

    var c, timer;
    scope.type = 'data';
    scope.loading = true;

    controller.$scope.$on('loadClientChart', function (evt,type){
      scope.resource = type;
      chart();
    });

    scope.refresh = function() {
      chart();
    };

    function chart() {
      var params = {
        type:     scope.type,
        resource: scope.resource
      };
      controller.getStats(params).then(function(data) {
        if (data.usage.inbound) {
          timer = $timeout(function() {
            drawChart(data.usage);
          },100);
        } else {
          scope.loading = undefined;
          scope.noData = true;
          clearChart();
        }
      }, function() {
        scope.loading = undefined;
        scope.noData = true;
        clearChart();
      });
    }

    var clearChart = function() {
      if (c) {
        c.clearChart();
      }
    };

    function drawChart(json) {

      $timeout.cancel(timer);
      var data = new window.google.visualization.DataTable();
      data.addColumn('string', 'Inbound');
      data.addColumn('number', 'Outbound');
      data.addRows([
        ['Outbound', json.outbound / (1000*1000) || 0],
        ['Inbound', json.inbound / (1000*1000) || 0]
      ]);

      var formatter = new window.google.visualization.NumberFormat(
        {suffix: 'MiB', pattern: '0.00'}
      );

      var opts = controller.options;
      opts.height = 255;
      opts.explorer = undefined;
      opts.pieHole = 0.6;
      opts.legend = { position: 'right' };
      opts.height = '255';
      opts.colors = ['#009688', '#FF5722'];


      formatter.format(data,1);
      c = new window.google.visualization.PieChart(document.getElementById('usage-chart'));
      c.draw(data, opts);
      scope.noData = undefined;
      scope.loading = undefined;
    }

  };

  return {
    link: link,
    scope: {
      mac: '@',
      loc: '@'
    },
    require: '^clientChart',
    template:
      '<md-card>'+
      '<md-card-header class="graph-small">'+
      '<md-card-header-text>'+
      '<span class="md-subhead">'+
      '{{ resource == \'device\'  ? \'Device\' : \'WiFi\' }} Usage'+
      '</span>'+
      '</md-card-header-text>'+
      '</md-card-header>'+
      '<md-card-content>'+
      '<div id="usage-chart"></div>'+
      '<div>'+
      '<div layout="row" ng-if=\'noData || loading\' style=\'min-height: 250px;\' layout-align="left end" class=\'muted\'>'+
      '<p><small><span ng-if=\'noData\'>No graph data</span><span ng-if=\'loading\'>Loading usage data</span></small></p>'+
      '</div>'+
      '<md-progress-linear ng-if=\'loading\' md-mode="query"></md-progress-linear>'+
      '</div>'+
      '</md-card-content>'+
      '</md-card>'
  };

}]);

app.directive('loadChart', ['Report', '$routeParams', '$timeout', function(Report, $routeParams, $timeout) {

  var link = function(scope,element,attrs,controller) {

    var c, timer;
    scope.loading = true;
    scope.type  = 'device_load';

    controller.$scope.$on('loadClientChart', function (evt, type){
      scope.resource = type;
      chart();
    });

    scope.refresh = function() {
      chart();
    };

    scope.fullScreen = function(type) {
      var t = { panel: type };
      if (!scope.fs) {
        scope.fs = true;
        controller.$scope.$broadcast('fullScreen', t);
      } else {
        scope.fs = undefined;
        controller.$scope.$broadcast('closeFullScreen', t);
      }
    };

    function chart() {
      var params = {
        type:     scope.type,
        resource: scope.resource
      };
      controller.getStats(params).then(function(data) {
        if (data.timeline.load) {
          timer = $timeout(function() {
            drawChart(data.timeline);
          },125);
        } else {
          scope.loading = undefined;
          scope.noData = true;
          clearChart();
        }
      });
    }

    var clearChart = function() {
      if (c) {
        c.clearChart();
      }
    };

    function drawChart(json) {

      $timeout.cancel(timer);

      var data = new window.google.visualization.DataTable();
      data.addColumn('datetime', 'Date');
      data.addColumn('number', 'dummySeries');
      data.addColumn('number', 'Load Average');
      var len = json.load.length;
      for(var i = 0; i < len; i++) {
        var load = json.load[i].value;
        if (!load) {
          load = 0;
        }
        var time = new Date(json.load[i].time / (1000*1000));
        data.addRow([time, null, load*100]);
      }
      var formatter = new window.google.visualization.NumberFormat(
        { pattern: '0', suffix: '%' }
      );
      formatter.format(data,2);

      var opts = controller.options;
      opts.legend = { position: 'none' };
      opts.series = {
        0: {
          targetAxisIndex: 0, visibleInLegend: false, pointSize: 0, lineWidth: 0
        },
        1: {
          targetAxisIndex: 1
        },
        2: {
          targetAxisIndex: 1
        }
      };
      opts.vAxes = {
        0: {
          textPosition: 'none'
        },
        1: {},
      };

      opts.explorer = {
        maxZoomOut:2,
        keepInBounds: true,
        axis: 'horizontal',
        actions: [ 'dragToZoom', 'rightClickToReset'],
      };
      if (scope.fs) {
        opts.height = 600;
      } else {
        opts.height = 250;
      }
      c = new window.google.visualization.LineChart(document.getElementById('load-chart'));
      c.draw(data, opts);
      scope.noData = undefined;
      scope.loading = undefined;
    }

  };

  return {
    link: link,
    // restrict: 'EA',
    scope: {
      mac: '@',
      loc: '@'
    },
    require: '^clientChart',
    template:
      '<md-card>'+
      '<md-card-header class="graph-small">'+
      '<md-card-header-text>'+
      '<span class="md-subhead">'+
      'Load Average'+
      '</span>'+
      '</md-card-header-text>'+
      '<md-button class="md-icon-button" ng-if="fs" ng-click="fullScreen()">'+
      '<md-icon>fullscreen_exit</md-icon>'+
      '</md-button>'+
      '<md-button class="md-icon-button" ng-if="!fs" ng-click="fullScreen(\'mcs\')">'+
      '<md-icon>fullscreen</md-icon>'+
      '</md-button>'+
      '<md-button class="md-icon-button" ng-click="refresh()">'+
      '<md-icon>refresh</md-icon>'+
      '</md-button>'+
      '</md-card-header>'+
      '<md-card-content>'+
      '<div id="load-chart"></div>'+
      '<div>'+
      '<div layout="row" ng-if=\'noData || loading\' style=\'min-height: 250px;\' layout-align="left end" class=\'muted\'>'+
      '<p><small><span ng-if=\'noData\'>No graph data</span><span ng-if=\'loading\'>Loading usage data</span></small></p>'+
      '</div>'+
      '<md-progress-linear ng-if=\'loading\' md-mode="query"></md-progress-linear>'+
      '</div>'+
      '</md-card-content>'+
      '</md-card>'
  };

}]);

app.directive('mcsChart', ['Report', '$routeParams', '$timeout', function(Report, $routeParams, $timeout) {

  var link = function(scope,element,attrs,controller) {

    var c, timer;
    scope.loading = true;
    scope.type  = 'mcs';

    controller.$scope.$on('loadClientChart', function  (){
      chart();
    });

    scope.refresh = function() {
      chart();
    };

    scope.fullScreen = function(type) {
      var t = { panel: type };
      if (!scope.fs) {
        scope.fs = true;
        controller.$scope.$broadcast('fullScreen', t);
      } else {
        scope.fs = undefined;
        controller.$scope.$broadcast('closeFullScreen', t);
      }
    };

    function chart() {
      var params = {
        type: scope.type,
        resource: scope.resource,
        fn: scope.fn
      };
      controller.getStats(params).then(function(data) {
        if (data.timeline.mcs) {
          timer = $timeout(function() {
            drawChart(data.timeline);
          },125);
        } else {
          scope.loading = undefined;
          scope.noData = true;
          clearChart();
        }
      });
    }

    var clearChart = function() {
      if (c) {
        c.clearChart();
      }
    };

    function drawChart(json) {

      $timeout.cancel(timer);
      var data = new window.google.visualization.DataTable();
      data.addColumn('datetime', 'Date');
      data.addColumn('number', 'dummySeries');
      data.addColumn('number', 'MCS Index');
      var len = json.mcs.length;
      for(var i = 0; i < len; i++) {
        var mcs = json.mcs[i].value;
        if (!mcs) {
          mcs = 0;
        }
        var time = new Date(json.mcs[i].time / (1000*1000));
        data.addRow([time, null, mcs]);
      }
      var formatter = new window.google.visualization.NumberFormat(
        { pattern: '0' }
      );
      formatter.format(data,1);

      var opts = controller.options;
      opts.legend = { position: 'none' };
      opts.series = {
        0: {
          targetAxisIndex: 0, visibleInLegend: false, pointSize: 0, lineWidth: 0
        },
        1: {
          targetAxisIndex: 1
        },
        2: {
          targetAxisIndex: 1
        }
      };
      opts.vAxes = {
        0: {
          textPosition: 'none'
        },
        1: {},
      };

      opts.explorer = {
        maxZoomOut:2,
        keepInBounds: true,
        axis: 'horizontal',
        actions: [ 'dragToZoom', 'rightClickToReset'],
      };
      if (scope.fs) {
        opts.height = 600;
      } else {
        opts.height = 250;
      }
      c = new window.google.visualization.LineChart(document.getElementById('mcs-chart'));
      c.draw(data, opts);
      scope.noData = undefined;
      scope.loading = undefined;
    }

  };

  return {
    link: link,
    // restrict: 'EA',
    scope: {
      mac: '@',
      loc: '@'
    },
    require: '^clientChart',
    template:
      '<md-card>'+
      '<md-card-header class="graph-small">'+
      '<md-card-header-text>'+
      '<span class="md-subhead">'+
      'MCS Index'+
      '</span>'+
      '</md-card-header-text>'+
      '<md-button class="md-icon-button" ng-if="fs" ng-click="fullScreen()">'+
      '<md-icon>fullscreen_exit</md-icon>'+
      '</md-button>'+
      '<md-button class="md-icon-button" ng-if="!fs" ng-click="fullScreen(\'mcs\')">'+
      '<md-icon>fullscreen</md-icon>'+
      '</md-button>'+
      '<md-button class="md-icon-button" ng-click="refresh()">'+
      '<md-icon>refresh</md-icon>'+
      '</md-button>'+
      '</md-card-header>'+
      '<md-card-content>'+
      '<div id="mcs-chart"></div>'+
      '<div>'+
      '<div layout="row" ng-if=\'noData || loading\' style=\'min-height: 250px;\' layout-align="left end" class=\'muted\'>'+
      '<p><small><span ng-if=\'noData\'>No graph data</span><span ng-if=\'loading\'>Loading usage data</span></small></p>'+
      '</div>'+
      '<md-progress-linear ng-if=\'loading\' md-mode="query"></md-progress-linear>'+
      '</div>'+
      '</md-card-content>'+
      '</md-card>'
  };

}]);

app.directive('snrChart', ['$timeout', 'Report', '$routeParams', function($timeout, Report, $routeParams) {

  var link = function(scope,element,attrs,controller) {

    var c, timer;
    scope.type  = 'signal';

    controller.$scope.$on('loadClientChart', function  (){
      chart();
    });

    scope.refresh = function() {
      chart();
    };

    scope.fullScreen = function(type) {
      var t = { panel: type };
      if (!scope.fs) {
        scope.fs = true;
        controller.$scope.$broadcast('fullScreen', t);
      } else {
        scope.fs = undefined;
        controller.$scope.$broadcast('closeFullScreen', t);
      }
    };

    function chart() {
      var params = {
        type: scope.type,
        resource: scope.resource,
        fn: scope.fn
      };
      controller.getStats(params).then(function(data) {
        if (data.timeline.signal) {
        timer = $timeout(function() {
          drawChart(data.timeline);
        },500);
        } else {
          scope.loading = undefined;
          scope.noData = true;
          clearChart();
        }
      }, function() {
        scope.loading = undefined;
        scope.noData = true;
        clearChart();
      });
    }

    var clearChart = function() {
      if (c) {
        c.clearChart();
      }
    };

    function drawChart(json) {

      $timeout.cancel(timer);
      var data = new window.google.visualization.DataTable();
      data.addColumn('datetime', 'Date');
      data.addColumn('number', 'dummySeries');
      data.addColumn('number', 'SNR');
      data.addColumn('number', 'Signal');
      data.addColumn('number', 'Noise');

      var len = json.signal.length;

      for(var i = 0; i < len; i++) {
        var time = new Date(json.signal[i].time / (1000*1000));
        var snr = 0, noise = 0, signal = 0;
        if (json.signal && json.signal[i] && json.signal[i].value) {
          signal = json.signal[i].value;
        }
        if (json.snr && json.snr[i] && json.snr[i].value) {
          snr = json.snr[i].value;
        }
        if (json.noise && json.noise[i] && json.noise[i].value) {
          noise = json.noise[i].value;
        }
        data.addRow([time, null, snr, signal, noise ]);
      }

      var formatter = new window.google.visualization.NumberFormat(
        {suffix: 'dB', negativeColor: 'red', negativeParens: true, pattern: '0'}
      );
      formatter.format(data,1);
      formatter = new window.google.visualization.NumberFormat(
        {suffix: 'dBm', negativeColor: 'red', negativeParens: true, pattern: '0'}
      );
      formatter.format(data,2);
      formatter.format(data,3);
      formatter.format(data,4);

      var opts = controller.options;
      opts.legend = { position: 'none' };
      opts.series = {
        0: {
          targetAxisIndex: 0, visibleInLegend: false, pointSize: 0, lineWidth: 0
        },
        1: {
          targetAxisIndex: 1
        },
        2: {
          targetAxisIndex: 1
        }
      };
      opts.vAxes = {
        0: {
          textPosition: 'none'
        },
        1: {},
      };

      opts.explorer = {
        maxZoomOut:2,
        keepInBounds: true,
        axis: 'horizontal',
        actions: [ 'dragToZoom', 'rightClickToReset'],
      };
      if (scope.fs) {
        opts.height = 600;
      } else {
        opts.height = 250;
      }
      opts.colors = ['#009688', '#FF5722', '#03A9F4', '#009688', '#607D8B'];
      c = new window.google.visualization.LineChart(document.getElementById('snr-chart'));
      c.draw(data, opts);
      scope.noData = undefined;
      scope.loading = undefined;
    }

  };

  return {
    link: link,
    scope: {
      mac: '@',
      loc: '@'
    },
    require: '^clientChart',
    template:
      '<md-card>'+
      '<md-card-header class="graph-small">'+
      '<md-card-header-text>'+
      '<span class="md-subhead">'+
      'Signal Strength'+
      '</span>'+
      '</md-card-header-text>'+
      '<md-button class="md-icon-button" ng-if="fs" ng-click="fullScreen()">'+
      '<md-icon>fullscreen_exit</md-icon>'+
      '</md-button>'+
      '<md-button class="md-icon-button" ng-if="!fs" ng-click="fullScreen(\'snr\')">'+
      '<md-icon>fullscreen</md-icon>'+
      '</md-button>'+
      '<md-button class="md-icon-button" ng-click="refresh()">'+
      '<md-icon>refresh</md-icon>'+
      '</md-button>'+
      '</md-card-header>'+
      '<md-card-content>'+
      '<div id="snr-chart"></div>'+
      '<div>'+
      '<div layout="row" ng-if=\'noData || loading\' style=\'min-height: 250px;\' layout-align="left end" class=\'muted\'>'+
      '<p><small><span ng-if=\'noData\'>No graph data</span><span ng-if=\'loading\'>Loading usage data</span></small></p>'+
      '</div>'+
      '<md-progress-linear ng-if=\'loading\' md-mode="query"></md-progress-linear>'+
      '</div>'+
      '</md-card-content>'+
      '</md-card>'
  };

}]);

app.directive('interfaceChart', ['Report', '$routeParams', '$timeout', function(Report, $routeParams, $timeout) {

  var link = function(scope,element,attrs,controller) {

    var c, timer;
    scope.loading = true;
    scope.type  = 'snr';
    scope.resource = 'device';

    controller.$scope.$on('loadClientChart', function (evt,type){
      chart();
    });

    scope.refresh = function() {
      chart();
    };

    scope.fullScreen = function(type) {
      var t = { panel: type };
      if (!scope.fs) {
        scope.fs = true;
        controller.$scope.$broadcast('fullScreen', t);
      } else {
        scope.fs = undefined;
        controller.$scope.$broadcast('closeFullScreen', t);
      }
    };

    scope.changeType = function(t) {
      scope.type = t;
      chart(scope.type);
    };

    scope.refresh = function() {
      chart();
    };

    function chart() {
      var params = {
        type: scope.type,
        resource: scope.resource,
        fn: scope.fn
      };
      controller.getStats(params).then(function(data) {
        if (data.timeline) {
          timer = $timeout(function() {
            drawChart(data.timeline);
          },125);
        } else {
          scope.loading = undefined;
          scope.noData = true;
          clearChart();
        }
      }, function() {
        scope.loading = undefined;
        scope.noData = true;
        clearChart();
      });
    }

    var clearChart = function() {
      if (c) {
        c.clearChart();
      }
    };

    function drawChart(json) {

      $timeout.cancel(timer);
      var data = new window.google.visualization.DataTable();

      data.addColumn('datetime', 'Date');
      data.addColumn('number', 'dummySeries');

      // Create temp store for interfaces and add columns //
      var ifaces = [];
      for (var k in json) {
        if (typeof json[k] !== 'function') {
          data.addColumn('number', k);
          ifaces.push(k);
        }
      }

      var dd = [];
      var first = json[ifaces[0]];

      if (first && first.values && first.values.length) {
        var len = first.values.length;

        for(var i = 0; i < len; i++) {

          var temp = [];

          for (k in ifaces) {
            var iface = ifaces[k];

            // Only insert the time and null col once //
            if (temp.length === 0) {
              var time = (json[iface].values[i].time);
              var t = new Date(time / (1000*1000));
              temp.push(t, null);
            }

            var val = (json[iface].values[i].value);
            temp.push(val);
          }
          data.addRow(temp);
        }

        var suffix;

        if (scope.type === 'snr' ) {
          suffix = 'dBm';
        } else if (scope.type === 'noise' || scope.type === 'signal') {
          suffix = 'dB';
        } else if (scope.type === 'quality') {
          // No prefix //
        } else {
          suffix = 'dB';
        }

        var formatter = new window.google.visualization.NumberFormat(
          {suffix: suffix, pattern: '0'}
        );

        for (i = 0; i < data.Kf.length; i++){
          formatter.format(data,i);
        }


        var opts = controller.options;
        opts.legend = { position: 'bottom' };
        opts.series = {
          0: {
            targetAxisIndex: 0, visibleInLegend: false, pointSize: 0, lineWidth: 0
          },
          1: {
            targetAxisIndex: 1
          },
          2: {
            targetAxisIndex: 1
          }
        };
        opts.vAxes = {
          0: {
            textPosition: 'none'
          },
          1: {},
        };

        opts.explorer = {
          maxZoomOut:2,
          keepInBounds: true,
          axis: 'horizontal',
          actions: [ 'dragToZoom', 'rightClickToReset'],
        };
        if (scope.fs) {
          opts.height = 600;
        } else {
          opts.height = 250;
        }
        c = new window.google.visualization.LineChart(document.getElementById('mcs-chart'));
        c.draw(data, opts);
        scope.noData = undefined;
        scope.loading = undefined;
      } else {
        scope.noData = true;
        scope.loading = undefined;
      }
    }

  };

  return {
    link: link,
    // restrict: 'EA',
    scope: {
      mac: '@',
      loc: '@'
    },
    require: '^clientChart',
    template:
      '<md-card>'+
      '<md-card-header class="graph-small">'+
      '<md-card-header-text>'+
      '<span class="md-subhead" ng-cloak>'+
      'Average {{ type | titleCase }}'+
      '</span>'+
      '</md-card-header-text>'+
      '<md-button class="md-icon-button" ng-if="fs" ng-click="fullScreen()">'+
      '<md-icon>fullscreen_exit</md-icon>'+
      '</md-button>'+
      '<md-button class="md-icon-button" ng-if="!fs" ng-click="fullScreen(\'mcs\')">'+
      '<md-icon>fullscreen</md-icon>'+
      '</md-button>'+
      '<md-button class="md-icon-button" ng-click="refresh()">'+
      '<md-icon>refresh</md-icon>'+
      '</md-button>'+
      '<md-menu-bar style="padding: 0">'+
      '<md-menu>'+
      '<button ng-click="$mdOpenMenu()">'+
      '<md-icon>more_vert</md-icon>'+
      '</button>'+
      '<md-menu-content width="3">'+
      '<md-menu-item>'+
      '<md-button ng-click="changeType(\'snr\')">'+
      'SNR'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeType(\'signal\')">'+
      'Signal'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeType(\'noise\')">'+
      'Noise'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeType(\'quality\')">'+
      'Quality'+
      '</md-button>'+
      '</md-menu-item>'+
      '</md-menu-content>'+
      '</md-menu>'+
      '</md-menu-bar>'+
      '</md-card-header>'+
      '<md-card-content>'+
      '<div id="mcs-chart"></div>'+
      '<div>'+
      '<div layout="row" ng-if=\'noData || loading\' style=\'min-height: 250px;\' layout-align="left end" class=\'muted\'>'+
      '<p><small><span ng-if=\'noData\'>No graph data</span><span ng-if=\'loading\'>Loading usage data</span></small></p>'+
      '</div>'+
      '<md-progress-linear ng-if=\'loading\' md-mode="query"></md-progress-linear>'+
      '</div>'+
      '</md-card-content>'+
      '</md-card>'
  };

}]);

app.directive('locationChart', ['Report', '$routeParams', '$timeout', '$location', function(Report, $routeParams, $timeout, $location) {

  var link = function(scope,element,attrs,controller) {

    scope.type = $routeParams.type || 'clients';
    var c, timer, data, json;
    var opts = controller.options;
    opts.colors = ['#FF5722', '#FF5722', '#009688', '#03A9F4', '#FF5722', '#607D8B'];

    var resource = 'location';
    scope.loading = true;

    $(window).resize(function() {
      if (this.resizeTO) {
        clearTimeout(this.resizeTO);
      }
      this.resizeTO = setTimeout(function() {
        $(this).trigger('resizeEnd');
      }, 500);
    });

    $(window).on('resizeEnd', function() {
      init();
    });

    function setTitle() {
      if (scope.type === 'usage') {
        scope.title = 'Usage Data';
      } else if (scope.type === 'clients') {
        scope.title = 'Wireless Clients';
      } else if (scope.type === 'impressions') {
        scope.title = 'Splash Impressions';
      } else if (scope.type === 'uniques') {
        scope.title = 'Splash Users';
      } else {
        scope.title = 'Splash Sessions';
      }
    }

    var init = function() {
      setTitle();
      setIntervals();
      chart();
    };

    var searchParams = function() {
      var hash = {};
      hash.type = scope.type;
      $location.search(hash);
    };

    scope.changeType = function(t) {
      clearChart();
      scope.type = t;
      searchParams();
      init();
    };

    // Cos we have period mixes in with start dates //
    var setIntervals = function() {
      if (scope.type === 'usage') {
        scope.interval = '1d';
        scope.period = '7d';
      } else {
        scope.interval = 'day';
        scope.period = undefined;
      }
    };

    scope.refresh = function() {
      chart();
    };

    function chart() {
      var params = {
        type: scope.type,
        resource: resource,
        period: scope.period,
        fn: scope.fn,
        interval: scope.interval,
        fill: '0'
      };
      controller.getStats(params).then(function(data) {
        if (data && data.timeline && data.timeline.stats) {
          json = data;
          drawChart();
        } else {
          clearChart();
        }
      }, function() {
        clearChart();
        console.log('No data returned for query');
      });
    }

    var clearChart = function() {
      if (c) {
        c.clearChart();
      }
      scope.noData = true;
      scope.loading = false;
    };

    function drawChart() {

      $timeout.cancel(timer);

      data = new window.google.visualization.DataTable();

      if (scope.type === 'usage') {
        usageChart();
      } else if (scope.type === 'clients') {
        clientsChart();
      } else if (scope.type === 'impressions') {
        sessionsChart();
      } else if (scope.type === 'uniques') {
        sessionsChart();
      } else {
        sessionsChart();
      }

      opts.legend = { position: 'none' };

      opts.series = {
        0: {
          targetAxisIndex: 0, visibleInLegend: false, pointSize: 0, lineWidth: 0
        },
        1: {
          targetAxisIndex: 1
        },
        2: {
          targetAxisIndex: 1
        }
      };
      opts.vAxes = {
        0: {
          textPosition: 'none'
        },
        1: {},
      };

      opts.explorer = {
        maxZoomOut:2,
        keepInBounds: true,
        axis: 'horizontal',
        actions: [ 'dragToZoom', 'rightClickToReset'],
      };
      if (scope.fs) {
        opts.height = 600;
      } else {
        opts.height = 250;
      }
      c = new window.google.visualization.LineChart(document.getElementById('location-chart'));
      c.draw(data, opts);
      scope.noData = undefined;
      scope.loading = undefined;
    }

    timer = $timeout(function() {
      init();
    }, 500);

    var clientsChart = function() {

      var stats = json.timeline.stats;

      var start = new Date(json._stats.start * 1000);

      if (stats && stats.length) {

        data.addColumn('datetime', 'Date');
        data.addColumn('number', 'dummySeries');
        data.addColumn('number', 'Clients');

        for(var i = 0; i < stats.length; i++) {
          var time = new Date(stats[i].time * (1000));
          data.addRow([time, null, stats[i].count]);
        }

      }

      var formatter = new window.google.visualization.NumberFormat(
        { pattern: '#,##0'}
      );
      formatter.format(data,2);
      opts.interpolateNulls = true;

    };

    var usageChart = function() {

      json = json.timeline;


      if (json.inbound && json.inbound.length) {
        var len = json.inbound.length;

        data.addColumn('date', 'Date');
        data.addColumn('number', 'dummySeries');
        data.addColumn('number', 'Inbound');
        data.addColumn('number', 'Outbound');

        for(var i = 0; i < len; i++) {

          var outbound = 0;
          var inbound = json.inbound[i].value;
          var time = new Date(json.inbound[i].time / (1000*1000));

          if (json.outbound && json.outbound[i] && json.outbound[i].value) {
            outbound = json.outbound[i].value;
          }
          data.addRow([time, null, inbound / (1000*1000), outbound / (1000*1000) ]);
        }

      }

      var formatter = new window.google.visualization.NumberFormat(
        { suffix: 'MiB', pattern: '#,##0'}
      );
      formatter.format(data,2);
      formatter.format(data,3);

      opts.vAxis = {};
    };

    var sessionsChart = function() {
      
      var start = new Date(json._stats.start * 1000);

      if (scope.type === 'impressions') {
        scope.title = 'Splash Impressions';
      } else if (scope.type === 'uniques') {
        scope.title = 'Splash Users';
      } else {
        scope.title = 'Splash Sessions';
      }

      var sessions = json.timeline.stats;

      data.addColumn('date', 'Date');
      data.addColumn('number', 'dummySeries');
      data.addColumn('number', scope.title);

      for(var i = 0; i < sessions.length; i++) {
        var time = new Date(sessions[i].time * (1000));
        data.addRow([time, null, sessions[i].count]);
      }

      var formatter = new window.google.visualization.NumberFormat(
        { pattern: '0' }
      );
      formatter.format(data,1);

      opts.vAxis = {
        viewWindowMode:'explicit',
        viewWindow:{
          min: 0
        }
      };
    };

  };

  return {
    link: link,
    scope: {
      mac: '@',
      loc: '@'
    },
    require: '^clientChart',
    template:
      '<md-card>'+
      '<md-card-header class="graph-small">'+
      '<md-card-header-text>'+
      '<span class="md-subhead">'+
      '{{ fn | titleCase }} {{ title }}'+
      '</span>'+
      '</md-card-header-text>'+
      '<md-button class="md-icon-button" ng-click="refresh()">'+
      '<md-icon>refresh</md-icon>'+
      '</md-button>'+
      '<md-menu-bar style="padding: 0">'+
      '<md-menu>'+
      '<button ng-click="$mdOpenMenu()">'+
      '<md-icon>more_vert</md-icon>'+
      '</button>'+
      '<md-menu-content width="3">'+
      '<md-menu-item>'+
      '<md-button ng-click="changeType()">'+
      'Splash Sessions'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeType(\'uniques\')">'+
      'Splash Users'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeType(\'impressions\')">'+
      'Splash Views'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeType(\'usage\')">'+
      'Usage Data'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeType(\'clients\')">'+
      'Wireless Clients'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-divider></md-menu-divider>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeFn(\'mean\')">'+
      'Average Values'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeFn(\'max\')">'+
      'Max. Values'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeFn(\'median\')">'+
      'Median Values'+
      '</md-button>'+
      '</md-menu-item>'+
      '<md-menu-item>'+
      '<md-button ng-click="changeFn(\'sum\')" ng-disabled="type == \'tx\'">'+
      'Sum'+
      '</md-button>'+
      '</md-menu-item>'+
      '</md-menu-content>'+
      '</md-menu>'+
      '</md-menu-bar>'+
      '</md-card-header>'+
      '<md-card-content>'+
      '<div id="location-chart"></div>'+
      '<div>'+
      '<div layout="row" ng-if=\'noData || loading\' style=\'min-height: 250px;\' layout-align="left end" class=\'muted\'>'+
      '<p><small><span ng-if=\'noData\'>No graph data</span><span ng-if=\'loading\'>Loading graph data</span></small></p>'+
      '</div>'+
      '<md-progress-linear ng-if=\'loading\' md-mode="query"></md-progress-linear>'+
      '</div>'+
      '</md-card-content>'+
      '</md-card>'
  };

}]);
