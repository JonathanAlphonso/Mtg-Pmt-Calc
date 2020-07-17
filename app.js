//Budget Controller
var budgetController = (function () {
    var mortgageDebt;
    var propertyValue;

    return {
        ltvRatio: function (mtgValue, propValue) {
            var ltv = Math.round(mtgValue / propValue * 100);
            return ltv;
        }
    };
})();

// UI Controller
var UIController = (function () {
    //The main input fields are interest rate, loan amount, and amortization terms fvxgfxdg
    var DOMstrings = {
        inputBtn: '.add__btn',
        inputDebt: '.add__debt_value',
        inputPropValue: '.add__property_value',
        calcResults: '.LTV-Calc-Results'
    };

    return {
        getinput: function () {
            return {
                //Convert from string with commas to number
                mtgValue: (parseFloat(document.querySelector(DOMstrings.inputDebt).value.replace(/,/g, ''))  || 0),
                
                propValue: (parseFloat(document.querySelector(DOMstrings.inputPropValue).value.replace(/,/g, '')) || 0)
            };
            
        },
        addLtv: function (ltv) {
            var html, newHtml, element;
            element = DOMstrings.calcResults;
            html = `Your Loan-to-Value ratio is ${ltv}%`;
            var el = document.querySelector(element);
            var newEl = document.createElement('p');
            if (!isNaN(ltv) && isFinite(ltv) && ltv > 0 && ltv < 101) {
                newEl.setAttribute('class', 'LTV-Calc-Results flip-in-hor-bottom');
                document.querySelector('#myChart').setAttribute('style', 'display:flex;')
                newEl.innerHTML = `Your Loan-to-Value ratio is <strong> ${ltv}%</strong>`;
            }
            else {
                newEl.setAttribute('class', 'LTV-Calc-Results');
                document.querySelector('#myChart').setAttribute('style', 'display:none;')
                newEl.innerHTML = 'Your numbers are not valid. Please check your inputs and try again.';
            }
            el.parentNode.replaceChild(newEl, el);
        },
        getDOMstrings: function () {
            return DOMstrings;
        },

        addChart: function (ltv) {
            var data = {
                labels: [
                    "Mortgage Debt",
                    "Home Equity"
                ],
                datasets: [
                    {
                        data: [ltv, 100 - ltv],
                        backgroundColor: [
                            "#FF6384",
                            "#36A2EB"
                        ],
                        hoverBackgroundColor: [
                            "#FF6384",
                            "#36A2EB",
                        ]
                    }]
            };

            var ctx = document.getElementById("myChart");

            // And for a doughnut chart
            var myDoughnutChart = new Chart(ctx, {
                type: 'doughnut',
                data: data,
                options: {
                    rotation: 1 * Math.PI,
                    circumference: 1 * Math.PI,
                    tooltips: {
                        callbacks: {
                            label: function (tooltipItem, data) {
                                var dataset = data.datasets[tooltipItem.datasetIndex];
                                var meta = dataset._meta[Object.keys(dataset._meta)[0]];
                                var total = meta.total;
                                var currentValue = dataset.data[tooltipItem.index];
                                var percentage = parseFloat((currentValue / total * 100).toFixed(1));
                                return percentage + '%';
                            },
                            title: function (tooltipItem, data) {
                                return data.labels[tooltipItem[0].index];
                            }
                        }
                    }
                }
            });
        }
    };
})();

//Global App Controller
var controller = (function (budgetCtrl, UICtrl) {
    var setupEventListeners = function () {
        var DOM = UICtrl.getDOMstrings();
        document.querySelector(DOM.inputBtn).addEventListener('click', ctrlAddItem);
        document.addEventListener('keypress', function (event) {
            if (event.keyCode === 13 || event.which === 13) {
                ctrlAddItem();
            }
        });
        //Format number when input field loses focus, adapted from SO code, so nice and DRY!
        [document.querySelector(DOM.inputDebt), document.querySelector(DOM.inputPropValue)].forEach(item => {
            item.addEventListener('focusout', event => {
              item.value = parseInt(item.value.replace(/\D/g,''),10).toLocaleString();
              if (isNaN(parseInt(item.value), 10)) {item.value="";}
            })
          })
    }

    var ctrlAddItem = function () {
        var input, newItem;
        //1. Get the field input data
        input = UICtrl.getinput();
        newItem = budgetCtrl.ltvRatio(input.mtgValue, input.propValue);
        //3. Add the item to the UI
        UICtrl.addLtv(newItem);
        //Add the cool chart js chart
        UICtrl.addChart(newItem);
    };

    return {
        init: function () {
            setupEventListeners();
        }
    }
})(budgetController, UIController);

controller.init();



