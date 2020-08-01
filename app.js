//Business Logic Controller
var budgetController = (function () {
    return {
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

        sum: function (input) {
            if (toString.call(input) !== "[object Array]") {
                return false;
            }

            var total = 0;
            for (var i = 0; i < input.length; i++) {
                if (isNaN(input[i])) {
                    continue;
                }
                total += Number(input[i]);
            }
            return total;
        },

        //For mortgages where only interest is paid. Not amortized.
        interestOnlyPmt: function (ir, np, pv) {
            return (pv * ir * 0.01 / np).toFixed(2);
        },

        ratePerPayment: function (ir, compound_period, periods_per_year) {
            return (((1 + ir * 0.01 / compound_period) ** (compound_period / periods_per_year)) - 1);
        },

        populateAmortTable: function (pmt, amortPeriod, payFreq, loanAmt, ratePerPmt) {
            var amortTable = {
                id: [0],
                pmt: [pmt.toFixed(2)],
                interest: [(loanAmt * ratePerPmt).toFixed(2)],
                principal: [(pmt - loanAmt * ratePerPmt).toFixed(2)],
                balance: [(loanAmt).toFixed(2)],
                totalPeriods: [amortPeriod * payFreq]
            }
            var totalPeriods = amortPeriod * payFreq;
            for (var i = 1; i <= totalPeriods; i++) {
                amortTable.id[i] = i;
                amortTable.pmt[i] = pmt.toFixed(2);
                amortTable.interest[i] = (amortTable.balance[(i - 1)] * ratePerPmt).toFixed(2);
                amortTable.principal[i] = (pmt - amortTable.interest[i]).toFixed(2);
                amortTable.balance[i] = (amortTable.balance[i - 1] - amortTable.principal[i]).toFixed(2);
                if (amortTable.balance[i] < 0) {
                    // Rapid payments have an unpredictable number of total periods
                    totalPeriods = i;
                    break;
                }
            }
            //Final payment is special, cannot pay past a balance of $0
            amortTable.principal[totalPeriods] = parseFloat(amortTable.principal[totalPeriods]) + parseFloat(amortTable.balance[totalPeriods]);
            amortTable.pmt[totalPeriods] = parseFloat(amortTable.principal[totalPeriods]) + parseFloat(amortTable.interest[totalPeriods]);
            amortTable.balance[totalPeriods] = 0;
            return amortTable;
        },
        populateYearlyAmortTable: function (amortTable, amortPeriod, payFreq) {
            var yearlyAmortTable = {
                id: [0],
                pmt: [0],
                interest: [0],
                principal: [0],
                balance: [amortTable.balance[0]],
                totalPeriods: amortPeriod
            }
            for (var i = 1; i <= amortPeriod; i++) {
                if (!amortTable.pmt[((((i - 1) * payFreq)))]) { break; }
                yearlyAmortTable.id[i] = [i],
                    yearlyAmortTable.pmt[i] = 0;
                yearlyAmortTable.interest[i] = 0;
                yearlyAmortTable.principal[i] = 0;
                yearlyAmortTable.balance[i] = 0;
                for (var j = 0; j < payFreq; j++) {
                    if (!amortTable.pmt[((((i - 1) * payFreq)) + j + 1)]) { break; }
                    yearlyAmortTable.pmt[i] += parseFloat(amortTable.pmt[((((i - 1) * payFreq)) + j + 1)]);
                    yearlyAmortTable.interest[i] += parseFloat(amortTable.interest[((((i - 1) * payFreq)) + j + 1)]);
                    yearlyAmortTable.principal[i] += parseFloat(amortTable.principal[((((i - 1) * payFreq)) + j + 1)]);
                    yearlyAmortTable.balance[i] = parseFloat(amortTable.balance[((((i - 1) * payFreq)) + j + 1)]);
                }
            }

            return yearlyAmortTable;
        }
    };
})();

// UI Controller
var UIController = (function () {
    //The main input fields are interest rate, loan amount, payment frequency and amortization
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
        //Keep more basic functions at the top
        getDOMstrings: function () {
            return DOMstrings;
        },
        getinput: function () {
            return {
                //Convert from string with commas to number
                mtgValue: (parseFloat(document.querySelector(DOMstrings.inputDebt).value.replace(/(?!\.)\D/g, ''))),
                interestRate: (parseFloat(document.querySelector(DOMstrings.inputRate).value.replace(/(?!\.)\D/g, ''))),
                amortPeriod: parseFloat(document.querySelector(DOMstrings.inputAmort).value),
                payFreq: document.querySelector(DOMstrings.inputPayFreq).value,
                //A bit long, but this will return a boolean to show if the payment is rapid or not
                rapidLabel: document.querySelector(DOMstrings.inputPayFreq).options[document.querySelector(DOMstrings.inputPayFreq).selectedIndex].innerHTML.includes("Rapid")

            };
        },
        addElement: function (parentId, elementTag, elementId, html) {
            // Adds an element to the document
            var p = document.getElementById(parentId);
            var newElement = document.createElement(elementTag);
            newElement.setAttribute('id', elementId);
            newElement.innerHTML = html;
            p.appendChild(newElement);
        },
        removeElement: function (elementId) {
            // Removes an element from the document
            var element = document.getElementById(elementId);
            element.parentNode.removeChild(element);
        },
        addPmt: function (pmt) {
            var html, newHtml, element;
            element = DOMstrings.calcResults;
            html = `Your Loan-to-Value ratio is $ ${pmt}`;
            var el = document.querySelector(element);
            var newEl = document.createElement('p');
            if (!isNaN(pmt) && isFinite(pmt) && pmt > 0) {
                newEl.setAttribute('class', 'LTV-Calc-Results flip-in-hor-bottom');
                newEl.innerHTML = `Your Payment is <strong>$ ${pmt.toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</strong>`;
                //Check for interest only payments first
                if (document.querySelector(DOMstrings.inputAmort).value != 0) {
                    //For amortized mortgages, show graphics
                    document.querySelector('#Mortgage-Payment-Graphics').setAttribute('style', 'display:contents;');
                }
                else {
                    //document.querySelector('#mortgageBalanceChart').setAttribute('style', 'display:none;');
                    if (document.querySelector('#Mortgage-Payment-Graphics')) {
                        //Only hide table if it is on the page
                        document.querySelector('#Mortgage-Payment-Graphics').setAttribute('style', 'display:none;');
                    }
                }


            }
            else {
                document.querySelector('#Mortgage-Payment-Graphics').setAttribute('style', 'display:none;');
                newEl.setAttribute('class', 'LTV-Calc-Results');
                newEl.innerHTML = 'Your numbers are not valid. Please check your inputs and try again.';
                if (document.querySelector(DOMstrings.inputAmort).value == 0 && document.querySelector(DOMstrings.inputPayFreq).options[document.querySelector(DOMstrings.inputPayFreq).selectedIndex].innerHTML.includes("Rapid")) {
                    newEl.innerHTML = 'Rapid payment schedules are not valid for interest-only mortgages. Please check your inputs and try again.';
                }
            }
            el.parentNode.replaceChild(newEl, el);
        },

        addAmortTable: function (tableData) {

            var html, newHtml, element;
            element = DOMstrings.amortTable;
            html = '';
            var el = document.querySelector(element);
            var newEl = document.createElement('p');
            newEl.setAttribute('class', 'Mortgage-Amort-Table table table-striped');


            html = `
        <div id="big_amortization_table">
            <div class="accordion accordion-light amortizationScheduleCard" id="accordion">
				<div class="card card-default">
							<div class="card-header">
								<h4 class="card-title m-0">
									<a class="accordion-toggle collapsed" data-toggle="collapse" data-parent="#accordion" href="#collapse0One" aria-expanded="false">
									  Yearly Mortgage Amortization Table										
									</a>
								</h4>
							</div>
							<div id="collapse0One" class="collapse" data-parent="#accordion" style="">
                                <div class="card-body"> 
                                    <table class="amortizationSchedule"  style="margin:auto">
                                        <thead>
                                            <tr>
                                                <th class="ng-binding">Year #</th>
                                                <th>Payment</th>
                                                <th>Interest (I)</th>
                                                <th>Principal (P)</th>
                                                <th>Closing balance</th>
                                            </tr>
                                        </thead>
                                    <tbody>
                        `;
            for (var i = 1; i <= (tableData.id.length - 1); i++) {
                html += `
                                    <tr>
                                        <td>${tableData.id[i]}</td>
                                        <td>$${tableData.pmt[i].toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td> 
                                        <td>$${tableData.interest[i].toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                                        <td>$${tableData.principal[i].toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                                        <td>$${tableData.balance[i].toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>
                                    </tr>   
                        `
            }
            html +=
                `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
                `
            newEl.innerHTML = html;
            el.parentNode.replaceChild(newEl, el);

        },




        addPaymentChart: function (numOfPayment, balance, num) {

            //first remove then add any existing charts 
            this.removeElement("mortgageBalanceChart");
            this.addElement("Mortgage-Balance-Chart-Parent", "canvas", "mortgageBalanceChart")

            var ctx = document.getElementById("mortgageBalanceChart");
            //lineChart.destroy();

            var pre = 'Year ';
            var arr = num;
            var newArr = (pre + arr.join(';' + pre)).split(';');

            num = newArr;


            var lineChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [...num],
                    datasets: [
                        {
                            label: "Mortgage Balance",
                            data: [...balance],
                            fill: true,
                            borderColor: "#1e5398",
                            backgroundColor: "#a9c6ea",
                            pointBackgroundColor: "#a9c6ea",
                            pointBorderColor: "#1e5398",
                            pointHoverBackgroundColor: "#a9c6ea",
                            pointHoverBorderColor: "#1e5398"

                        }
                    ]
                },

                options: {
                    responsive: true,
                    title: {
                        display: true,
                        text: 'Payment History'
                    },
                    scales: {
                        xAxes: [{
                            display: true,
                            label: 'Year Number',
                            scaleLabel: {
                                display: true,
                                labelString: 'Year Number'
                            }
                        }],
                        yAxes: [{
                            display: true,
                            scaleLabel: {
                                display: true,
                                labelString: 'Remaining Mortgage Principal'
                            },
                            ticks: {
                                // Include a dollar sign in the ticks
                                callback: function (value, index, values) {
                                    return '$' + value;
                                }
                            }
                        }]
                    },
                    tooltips: {
                        enabled: true,
                        mode: 'index',
                        callbacks: {
                            label: function (tooltipItems, data) {
                                return '$' + tooltipItems.yLabel;
                            }
                        }
                    }
                }


            });
        },
        addInterestPrincipalChart: function (interest, principal) {


            //first remove then add any existing charts 
            this.removeElement("interestPrincipalChart");
            this.addElement("Interest-Principal-Chart-Parent", "canvas", "interestPrincipalChart")

            var ctx = document.getElementById("interestPrincipalChart");

            var lineChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Interest', 'Principal'],
                    datasets: [
                        {
                            label: "Mortgage Balance",
                            data: [interest, principal],
                            backgroundColor: [
                                "#ffcccb",
                                "#a9c6ea"

                            ]

                        }
                    ]
                },

                options: {
                    responsive: true,
                    title: {
                        display: true,
                        text: 'Total Interest vs Principal Payments'
                    },
                    tooltips: {
                        enabled: true,
                        mode: 'single',
                        callbacks: {
                            label: function (tooltipItems, data) {
                                return '$' + data.datasets[0].data[tooltipItems.index];
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
        var input, mortgagePayment, ratePerPayment;
        //1. Get the field input data
        input = UICtrl.getinput();

        if (input.amortPeriod > 0 && !input.rapidLabel) {
            ratePerPayment = budgetCtrl.ratePerPayment(input.interestRate, 2, input.payFreq);
            mortgagePayment = -budgetCtrl.PMT(
                ratePerPayment,
                input.amortPeriod * input.payFreq,
                input.mtgValue,
                0, 0).toFixed(2);
        }
        else if (input.rapidLabel && input.payFreq == 26) { //Rapid Bi-Weekly
            ratePerPayment = (((1 + input.interestRate * 0.01 / 2) ** (2 / 12)) - 1)
            mortgagePayment = -budgetCtrl.PMT(
                ratePerPayment,
                input.amortPeriod * 12,
                input.mtgValue / 2,
                0, 0).toFixed(2);
            ratePerPayment = budgetCtrl.ratePerPayment(input.interestRate, 2, input.payFreq);
        }
        else if (input.rapidLabel && input.payFreq == 52) { //Rapid Weekly
            ratePerPayment = (((1 + input.interestRate * 0.01 / 2) ** (2 / 12)) - 1)
            mortgagePayment = -budgetCtrl.PMT(
                ratePerPayment,
                input.amortPeriod * 12,
                input.mtgValue / 4,
                0, 0).toFixed(2);
            ratePerPayment = budgetCtrl.ratePerPayment(input.interestRate, 2, input.payFreq);
        }
        else {
            mortgagePayment = budgetCtrl.interestOnlyPmt(input.interestRate, input.payFreq, input.mtgValue);
        }

        //3. Add the item to the UI
        UICtrl.addPmt(mortgagePayment);
        //Add the cool chart js chart

        if (input.amortPeriod != 0) {
            //Shouldn't run with interest only payments
            tableData = budgetCtrl.populateAmortTable(mortgagePayment, input.amortPeriod, parseFloat(input.payFreq), input.mtgValue, ratePerPayment);
            yearlyTableData = budgetCtrl.populateYearlyAmortTable(tableData, input.amortPeriod, parseFloat(input.payFreq));
            UICtrl.addAmortTable(yearlyTableData);
            UICtrl.addPaymentChart(yearlyTableData.totalPeriods, yearlyTableData.balance, yearlyTableData.id);
            UICtrl.addInterestPrincipalChart(budgetCtrl.sum(yearlyTableData.interest).toFixed(2), budgetCtrl.sum(yearlyTableData.principal).toFixed(2));
        }
    };

    return {
        init: function () {
            setupEventListeners();

        }
    }
})(budgetController, UIController);

controller.init();



