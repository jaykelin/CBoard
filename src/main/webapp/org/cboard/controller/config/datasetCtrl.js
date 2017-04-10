/**
 * Created by yfyuan on 2016/10/11.
 */
cBoard.controller('datasetCtrl', function ($scope, $http, dataService, $uibModal, ModalUtils, $filter, chartService, $timeout) {

    var translate = $filter('translate');
    $scope.optFlag = 'none';
    $scope.curDataset = {data: {expressions: [], filters: []}};
    $scope.curWidget = {};
    $scope.alerts = [];
    $scope.verify = {dsName: true};
    $scope.loadFromCache = true;

    var treeID = 'dataSetTreeID'; // Set to a same value with treeDom
    var originalData = [];
    var updateUrl = "dashboard/updateDataset.do";

    $http.get("dashboard/getDatasourceList.do").success(function (response) {
        $scope.datasourceList = response;
    });

    var getDatasetList = function () {
        $http.get("dashboard/getDatasetList.do").success(function (response) {
            $scope.datasetList = response;
            $scope.searchNode();
        });

    };

    var getCategoryList = function () {
        $http.get("dashboard/getDatasetCategoryList.do").success(function (response) {
            $scope.categoryList = response;
            $("#DatasetName").autocomplete({
                source: $scope.categoryList
            });
        });
    };

    getCategoryList();
    getDatasetList();

    $scope.newDs = function () {
        $scope.optFlag = 'new';
        $scope.curDataset = {data: {expressions: [], filters: []}};
        $scope.curWidget = {};
        cleanPreview();
    };

    $scope.editDs = function (ds) {
        $http.post("dashboard/checkDatasource.do", {id: ds.data.datasource}).success(function (response) {
            if (response.status == '1') {
                doEditDs(ds);
            } else {
                ModalUtils.alert(translate("ADMIN.CONTACT_ADMIN") + "：Datasource/" + response.msg, "modal-danger", "lg");
            }
        });
    };

    var doEditDs = function (ds) {
        $scope.optFlag = 'edit';
        $scope.curDataset = angular.copy(ds);
        $scope.curDataset.name = $scope.curDataset.categoryName + '/' + $scope.curDataset.name;
        if (!$scope.curDataset.data.expressions) {
            $scope.curDataset.data.expressions = [];
        }
        if (!$scope.curDataset.data.filters) {
            $scope.curDataset.data.filters = [];
        }
        $scope.datasource = _.find($scope.datasourceList, function (ds) {
            return ds.id == $scope.curDataset.data.datasource;
        });
        $scope.curWidget.query = $scope.curDataset.data.query;
        $scope.loadData();
    };

    $scope.deleteDs = function (ds) {
        $http.get("dashboard/getAllWidgetList.do").then(function (response) {
            if (!response) {
                return false;
            }
            var resDs = [];

            for (var i = 0; i < response.data.length; i++) {
                if (response.data[i].data.datasetId == ds.id) {
                    resDs.push(response.data[i].name);
                }
            }

            if (resDs.length > 0) {
                var warnStr = translate("CONFIG.WIDGET.WIDGET") + ":[" + resDs.toString() + "]";
                ModalUtils.alert(translate("COMMON.NOT_ALLOWED_TO_DELETE_BECAUSE_BE_DEPENDENT") + warnStr, "modal-warning", "lg");
                return false;
            }
            ModalUtils.confirm(translate("COMMON.CONFIRM_DELETE"), "modal-warning", "lg", function () {
                $http.post("dashboard/deleteDataset.do", {id: ds.id}).success(function (serviceStatus) {
                    if (serviceStatus.status == '1') {
                        getDatasetList();
                    } else {
                        ModalUtils.alert(serviceStatus.msg, "modal-warning", "lg");
                    }
                    $scope.optFlag = 'none';
                });
            });
        });
    };

    $scope.copyDs = function (ds) {
        var data = angular.copy(ds);
        data.name = data.name + "_copy";
        $http.post("dashboard/saveNewDataset.do", {json: angular.toJson(data)}).success(function (serviceStatus) {
            if (serviceStatus.status == '1') {
                $scope.optFlag = 'none';
                getDatasetList();
                ModalUtils.alert(translate("COMMON.SUCCESS"), "modal-success", "sm");
            } else {
                ModalUtils.alert(serviceStatus.msg, "modal-warning", "lg");
            }
        });
    };

    var validate = function () {
        $scope.alerts = [];
        if (!$scope.curDataset.name) {
            $scope.alerts = [{msg: translate('CONFIG.DATASET.NAME') + translate('COMMON.NOT_EMPTY'), type: 'danger'}];
            $scope.verify = {dsName: false};
            $("#DatasetName").focus();
            return false;
        }
        return true;
    };

    $scope.save = function () {
        $scope.datasource ? $scope.curDataset.data.datasource = $scope.datasource.id : null;
        $scope.curDataset.data.query = $scope.curWidget.query;

        if (!validate()) {
            return;
        }
        var ds = angular.copy($scope.curDataset);
        var index = ds.name.lastIndexOf('/');
        ds.categoryName = $scope.curDataset.name.substring(0, index).trim();
        ds.name = $scope.curDataset.name.slice(index + 1).trim();
        if (ds.categoryName == '') {
            ds.categoryName = translate("COMMON.DEFAULT_CATEGORY");
        }

        if ($scope.optFlag == 'new') {
            $http.post("dashboard/saveNewDataset.do", {json: angular.toJson(ds)}).success(function (serviceStatus) {
                if (serviceStatus.status == '1') {
                    $scope.optFlag = 'edit';
                    getCategoryList();
                    getDatasetList();
                    $scope.verify = {dsName: true};
                    ModalUtils.alert(translate("COMMON.SUCCESS"), "modal-success", "sm");
                } else {
                    $scope.alerts = [{msg: serviceStatus.msg, type: 'danger'}];
                }
            });
        } else {
            $http.post(updateUrl, {json: angular.toJson(ds)}).success(function (serviceStatus) {
                if (serviceStatus.status == '1') {
                    $scope.optFlag = 'edit';
                    getCategoryList();
                    getDatasetList();
                    $scope.verify = {dsName: true};
                    ModalUtils.alert(translate("COMMON.SUCCESS"), "modal-success", "sm");
                } else {
                    $scope.alerts = [{msg: serviceStatus.msg, type: 'danger'}];
                }
            });
        }

    };

    $scope.editFilterGroup = function (col) {
        var selects = angular.copy($scope.selects);
        $uibModal.open({
            templateUrl: 'org/cboard/view/config/modal/filterGroup.html',
            windowTemplateUrl: 'org/cboard/view/util/modal/window.html',
            backdrop: false,
            scope: $scope,
            controller: function ($scope, $uibModalInstance) {
                if (col) {
                    $scope.data = angular.copy(col);
                } else {
                    $scope.data = {group: '', filters: []};
                }
                $scope.selects = selects;
                $scope.close = function () {
                    $uibModalInstance.close();
                };
                $scope.addColumn = function (str) {
                    $scope.data.filters.push({col: str, type: '=', values: []})
                };
                $scope.ok = function () {
                    if (col) {
                        col.group = $scope.data.group;
                        col.filters = $scope.data.filters;
                    } else {
                        if ($scope.$parent.curDataset.data.filters == null) {
                            $scope.$parent.curDataset.data.filters = [];
                        }
                        $scope.$parent.curDataset.data.filters.push($scope.data);
                    }
                    $uibModalInstance.close();
                };
                $scope.editFilter = function (filter) {
                    $uibModal.open({
                        templateUrl: 'org/cboard/view/config/modal/dsFilter.html',
                        windowTemplateUrl: 'org/cboard/view/util/modal/window.html',
                        backdrop: false,
                        size: 'lg',
                        controller: function ($scope, $uibModalInstance) {
                            $scope.filter = angular.copy(filter);
                            $scope.type = ['=', '≠', '>', '<', '≥', '≤', '(a,b]', '[a,b)', '(a,b)', '[a,b]'];
                            $scope.close = function () {
                                $uibModalInstance.close();
                            };
                            $scope.selected = function (v) {
                                return _.indexOf($scope.col.values, v) == -1
                            };
                            $scope.ok = function () {
                                filter.type = $scope.filter.type;
                                filter.values = $scope.filter.values;
                                $uibModalInstance.close();
                            };
                        }
                    });
                };
            }
        });
    };

    $scope.editExp = function (col) {
        var selects = angular.copy($scope.selects);
        var aggregate = [
            {name: 'sum', value: 'sum'},
            {name: 'count', value: 'count'},
            {name: 'avg', value: 'avg'},
            {name: 'max', value: 'max'},
            {name: 'min', value: 'min'}
        ];
        var ok;
        var data = {expression: ''};
        if (!col) {
            ok = function (exp, alias) {
                $scope.curDataset.data.expressions.push({
                    type: 'exp',
                    exp: data.expression,
                    alias: data.alias
                });
            }
        } else {
            data.expression = col.exp;
            data.alias = col.alias;
            ok = function (data) {
                col.exp = data.expression;
                col.alias = data.alias;
            }
        }

        $uibModal.open({
            templateUrl: 'org/cboard/view/config/modal/exp.html',
            windowTemplateUrl: 'org/cboard/view/util/modal/window.html',
            backdrop: false,
            controller: function ($scope, $uibModalInstance) {
                $scope.data = data;
                $scope.selects = selects;
                $scope.aggregate = aggregate;
                $scope.alerts = [];
                $scope.close = function () {
                    $uibModalInstance.close();
                };
                $scope.addToken = function (str, agg) {
                    var tc = document.getElementById("expression_area");
                    var tclen = $scope.data.expression.length;
                    tc.focus();
                    var selectionIdx = 0;
                    if (typeof document.selection != "undefined") {
                        document.selection.createRange().text = str;
                        selectionIdx = str.length - 1;
                    }
                    else {
                        var a = $scope.data.expression.substr(0, tc.selectionStart);
                        var b = $scope.data.expression.substring(tc.selectionStart, tclen);
                        $scope.data.expression = a + str;
                        selectionIdx = $scope.data.expression.length - 1;
                        $scope.data.expression += b;
                    }
                    if (!agg) {
                        selectionIdx++;
                    }
                    tc.selectionStart = selectionIdx;
                    tc.selectionEnd = selectionIdx;
                };
                $scope.verify = function () {
                    $scope.alerts = [];
                    var v = verifyAggExpRegx($scope.data.expression);
                    $scope.alerts = [{
                        msg: v.isValid ? translate("COMMON.SUCCESS") : v.msg,
                        type: v.isValid ? 'success' : 'danger'
                    }];
                };
                $scope.ok = function () {
                    if (!$scope.data.alias) {
                        ModalUtils.alert(translate('CONFIG.WIDGET.ALIAS') + translate('COMMON.NOT_EMPTY'), "modal-warning", "lg");
                        return;
                    }
                    ok($scope.data);
                    $uibModalInstance.close();
                };
            }
        });
    };

    $scope.loadData = function () {
        cleanPreview();
        $scope.loading = true;

        dataService.getColumns({
            datasource: $scope.datasource.id,
            query: $scope.curWidget.query,
            datasetId: null,
            reload: !$scope.loadFromCache,
            callback: function (dps) {
                $scope.loading = false;
                $scope.toChartDisabled = false;
                if (dps.msg == "1") {
                    $scope.alerts = [];
                    $scope.selects = dps.columns;
                } else {
                    $scope.alerts = [{msg: dps.msg, type: 'danger'}];
                }

                var widget = {
                    chart_type: "table",
                    filters: [],
                    groups: [],
                    keys: [],
                    selects: [],
                    values: [{
                        cols: []
                    }
                    ]
                };
                _.each($scope.selects, function (c) {
                    widget.keys.push({
                        col: c,
                        type: "eq",
                        values: []
                    });
                });
            }
        });
    };

    var cleanPreview = function () {
        $('#dataset_preview').html("");
    };


    /**  js tree related start **/
    $scope.treeConfig = jsTreeConfig1;

    $("#" + treeID).keyup(function (e) {
        if (e.keyCode == 46) {
            $scope.deleteNode();
        }
    });

    var getSelectedDataSet = function () {
        var selectedNode = jstree_GetSelectedNodes(treeID)[0];
        return _.find($scope.datasetList, function (ds) {
            return ds.id == selectedNode.id;
        });
    };

    var checkTreeNode = function (actionType) {
        return jstree_CheckTreeNode(actionType, treeID, ModalUtils.alert);
    };

    var switchNode = function (id) {
        $scope.ignoreChanges = false;
        var dataSetTree = jstree_GetWholeTree(treeID);
        dataSetTree.deselect_all();
        dataSetTree.select_node(id);
    };

    $scope.applyModelChanges = function () {
        return !$scope.ignoreChanges;
    };

    $scope.copyNode = function () {
        if (!checkTreeNode("copy")) return;
        $scope.copyDs(getSelectedDataSet());
    };

    $scope.editNode = function () {
        if (!checkTreeNode("edit")) return;
        $scope.editDs(getSelectedDataSet());
    };

    $scope.deleteNode = function () {
        if (!checkTreeNode("delete")) return;
        $scope.deleteDs(getSelectedDataSet());
    };
    $scope.searchNode = function () {
        var para = {dsName: '', dsrName: ''};
        //map datasetList to list (add datasourceName)
        var list = $scope.datasetList.map(function (ds) {
            var dsr = _.find($scope.datasourceList, function (obj) {
                return obj.id == ds.data.datasource
            });
            return {
                "id": ds.id,
                "name": ds.name,
                "categoryName": ds.categoryName,
                "datasourceName": dsr ? dsr.name : ''
            };
        });
        //split search keywords
        if ($scope.keywords) {
            if ($scope.keywords.indexOf(' ') == -1 && $scope.keywords.indexOf(':') == -1) {
                para.dsName = $scope.keywords;
            } else {
                var keys = $scope.keywords.split(' ');
                for (var i = 0; i < keys.length; i++) {
                    var w = keys[i].trim();
                    if (w.split(':')[0] == 'ds') {
                        para["dsName"] = w.split(':')[1];
                    }
                    if (w.split(':')[0] == 'dsr') {
                        para["dsrName"] = w.split(':')[1];
                    }
                }
            }
        }
        //filter data by keywords
        originalData = jstree_CvtVPath2TreeData(
            $filter('filter')(list, {name: para.dsName, datasourceName: para.dsrName})
        );

        jstree_ReloadTree(treeID, originalData);
    };

    $scope.treeEventsObj = function () {
        var baseEventObj = jstree_baseTreeEventsObj({
            ngScope: $scope, ngHttp: $http, ngTimeout: $timeout,
            treeID: treeID, listName: "datasetList", updateUrl: updateUrl
        });
        return baseEventObj;
    }();

    /**  js tree related end **/
});