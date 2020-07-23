//Business Logic Controller
var budgetController = (function () {
    var mortgageDebt;
    var propertyValue;

    return {
        ltvRatio: function (mtgValue, propValue) {
            var ltv = Math.round(mtgValue / propValue * 100);
            return ltv;
        },

        PMT: function (ir, np, pv, fv, type) {
            /*
            Taken from the kindly Stack Overflow user: Vault
             * ir   - interest rate per month
             * np   - number of periods (months)
             * pv   - present value
             * fv   - future value
             * type - when the payments are due:
             *        0: end of the period, e.g. end of month (default)
             *        1: beginning of period
             */
            var pmt, pvif;

            fv || (fv = 0);
            type || (type = 0);

            if (ir === 0)
                return -(pv + fv) / np;

            pvif = Math.pow(1 + ir, np);
            pmt = - ir * pv * (pvif + fv) / (pvif - 1);

            if (type === 1)
                pmt /= (1 + ir);

            return pmt;
        },

        //For mortgages where only interest is paid. Not amortized.
        interestOnlyPmt: function (ir, np, pv) {
            return (pv * ir * 0.01 / np).toFixed(2);
        },

        ratePerPayment: function (ir, compound_period, periods_per_year) {
            return (((1 + ir * 0.01 / compound_period) ** (compound_period / periods_per_year)) - 1);
        },

        populateAmortTable: function (pmt, amortPeriod, payFreq, loanAmt, ratePerPmt) {
            console.log(pmt, amortPeriod, payFreq, loanAmt, ratePerPmt);
            console.log(loanAmt*ratePerPmt);
            var amortTable = {
                id: [0],
                pmt:[pmt.toFixed(2)],      
                interest: [(loanAmt*ratePerPmt).toFixed(2)],
                principal: [(pmt-loanAmt*ratePerPmt).toFixed(2)],
                balance: [(loanAmt).toFixed(2)]
            }
            console.log(amortTable);
            
            for (var i = 1; i <= (amortPeriod*payFreq); i++) {
                amortTable.id[i] = i;
                amortTable.pmt[i] = pmt.toFixed(2);
                amortTable.interest[i] = (amortTable.balance[(i-1)]*ratePerPmt).toFixed(2);
                console.log(amortTable.balance[(i-1)]);   
                amortTable.principal[i] = (pmt-amortTable.interest[i]).toFixed(2);
                amortTable.balance[i] = (amortTable.balance[i-1]-amortTable.principal[i]).toFixed(2);
                if(amortTable.balance[i]<0){
                    amortTable.principal[i] = parseFloat(amortTable.principal[i])+parseFloat(amortTable.balance[i]);
                    amortTable.balance[i]=0;
                }
                
            }
            //console.log(amortTable);
            

            return amortTable;
        }

    };
})();

// UI Controller
var UIController = (function () {
    //The main input fields are interest rate, loan amount, and amortization terms
    var DOMstrings = {
        inputBtn: '.add__btn',
        inputRate: '.add__interest_rate',
        inputAmort: '.add__amort_period',
        inputPayFreq: '.add__payment_freq',
        inputDebt: '.add__debt_value',
        inputPropValue: '.add__property_value',
        calcResults: '.LTV-Calc-Results',
        amortTable: '.Mortgage-Amort-Table'
    };

    return {
        getinput: function () {
            return {
                //Convert from string with commas to number
                mtgValue: (parseFloat(document.querySelector(DOMstrings.inputDebt).value.replace(/(?!\.)\D/g, '')) || 0),
                interestRate: (parseFloat(document.querySelector(DOMstrings.inputRate).value.replace(/(?!\.)\D/g, '')) || 0),
                amortPeriod: parseFloat(document.querySelector(DOMstrings.inputAmort).value),
                payFreq: document.querySelector(DOMstrings.inputPayFreq).value


            };

        },
        addPmt: function (pmt) {
            var html, newHtml, element;
            element = DOMstrings.calcResults;
            html = `Your Loan-to-Value ratio is $ ${pmt}`;
            var el = document.querySelector(element);
            var newEl = document.createElement('p');
            if (!isNaN(pmt) && isFinite(pmt) && pmt > 0) {
                newEl.setAttribute('class', 'LTV-Calc-Results flip-in-hor-bottom');
                document.querySelector('#myChart').setAttribute('style', 'display:flex;')
                newEl.innerHTML = `Your Payment is <strong>$ ${pmt}</strong>`;
            }
            else {
                newEl.setAttribute('class', 'LTV-Calc-Results');
                document.querySelector('#myChart').setAttribute('style', 'display:none;')
                newEl.innerHTML = 'Your numbers are not valid. Please check your inputs and try again.';
            }
            el.parentNode.replaceChild(newEl, el);
        },

        addAmortTable: function (tableData) {
            var html, newHtml, element;
            element = DOMstrings.amortTable;
            html = '';
            var el = document.querySelector(element);
            var newEl = document.createElement('p');
            newEl.setAttribute('class', 'Mortgage-Amort-Table');
            // document.querySelector('#myChart').setAttribute('style', 'display:none;')
            html = `
                <table class="amortizationSchedule">
                    <thead>
                        <tr>
                            <th class="ng-binding">Payment #</th>
                            <th>Payment</th>
                            <th>Interest (I)</th>
                            <th>Principal (P)</th>
                            <th>Closing balance</th>
                        </tr>
                    </thead>
                <tbody>
                        `;
            for (var i = 1; i <= (tableData.id.length-1); i++) {
                html += `
                        <tr>
                            <td>${tableData.id[i]}</td>
                            <td>${tableData.pmt[i]}</td> 
                            <td>${tableData.interest[i]}</td>
                            <td>${tableData.principal[i]}</td>
                            <td>${tableData.balance[i]}</td>
                        </tr>   
                        `                  
            }
            html +=
                `
                </tbody>
                </table>
                `
                newEl.innerHTML = html;
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
        [document.querySelector(DOM.inputDebt), document.querySelector(DOM.inputRate)].forEach(item => {
            item.addEventListener('focusout', event => {
                item.value = parseFloat(item.value.replace(/(?!\.)\D/g, '')).toLocaleString();
                if (isNaN(parseFloat(item.value))) { item.value = ""; }
            })
        })
    }

    var ctrlAddItem = function () {
        var input, newItem, ratePerPayment;
        //1. Get the field input data
        input = UICtrl.getinput();
        newItem = budgetCtrl.ltvRatio(input.mtgValue, input.propValue);
        console.log(-budgetCtrl.PMT(0.004531682, 25 * 12, 135000, 0, 0).toFixed(2));
        console.log(input.interestRate, input.amortPeriod * 12, input.mtgValue, input.payFreq);
        console.log(((1 + input.interestRate * 0.01 / 2) ** (2 / 12)) - 1);
        
        if (input.amortPeriod > 0) {
            ratePerPayment = budgetCtrl.ratePerPayment(input.interestRate, 2, input.payFreq);
            newItem = -budgetCtrl.PMT(
                ratePerPayment,
                input.amortPeriod * input.payFreq,
                input.mtgValue,
                0, 0).toFixed(2);
        }
        else {
            newItem = budgetCtrl.interestOnlyPmt(input.interestRate, input.payFreq, input.mtgValue);
        }
        console.log(newItem);
        //3. Add the item to the UI
        //UICtrl.addLtv(newItem);
        UICtrl.addPmt(newItem);
        //Add the cool chart js chart
        UICtrl.addChart(newItem);
        
        tableData = budgetCtrl.populateAmortTable(newItem, input.amortPeriod, parseFloat(input.payFreq), input.mtgValue,ratePerPayment);
        UICtrl.addAmortTable(tableData);
    };

    return {
        init: function () {
            setupEventListeners();

        }
    }
})(budgetController, UIController);

controller.init();



