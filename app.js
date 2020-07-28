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
           // console.log(pmt, amortPeriod, payFreq, loanAmt, ratePerPmt);
           // console.log(loanAmt*ratePerPmt);
            var amortTable = {
                id: [0],
                pmt:[pmt.toFixed(2)],      
                interest: [(loanAmt*ratePerPmt).toFixed(2)],
                principal: [(pmt-loanAmt*ratePerPmt).toFixed(2)],
                balance: [(loanAmt).toFixed(2)],
                totalPeriods: [amortPeriod*payFreq]
            }
            //console.log(amortTable);
            var totalPeriods = amortPeriod*payFreq;
            for (var i = 1; i <= totalPeriods; i++) {
                amortTable.id[i] = i;
                amortTable.pmt[i] = pmt.toFixed(2);
                amortTable.interest[i] = (amortTable.balance[(i-1)]*ratePerPmt).toFixed(2);
                //console.log(amortTable.balance[(i-1)]);   
                amortTable.principal[i] = (pmt-amortTable.interest[i]).toFixed(2);
                amortTable.balance[i] = (amortTable.balance[i-1]-amortTable.principal[i]).toFixed(2);
                if(amortTable.balance[i]<0){
                    // amortTable.principal[i] = parseFloat(amortTable.principal[i])+parseFloat(amortTable.balance[i]);
                    // amortTable.pmt[i] = parseFloat(amortTable.principal[i])+parseFloat(amortTable.interest[i]);
                    // amortTable.balance[i]=0;
                    totalPeriods = i;
                    break;
                }
                
            }
            
            amortTable.principal[totalPeriods] = parseFloat(amortTable.principal[totalPeriods])+parseFloat(amortTable.balance[totalPeriods]);
            amortTable.pmt[totalPeriods] = parseFloat(amortTable.principal[totalPeriods])+parseFloat(amortTable.interest[totalPeriods]);
            amortTable.balance[totalPeriods]=0;
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
                mtgValue: (parseFloat(document.querySelector(DOMstrings.inputDebt).value.replace(/(?!\.)\D/g, ''))),
                interestRate: (parseFloat(document.querySelector(DOMstrings.inputRate).value.replace(/(?!\.)\D/g, ''))),
                amortPeriod: parseFloat(document.querySelector(DOMstrings.inputAmort).value),
                payFreq: document.querySelector(DOMstrings.inputPayFreq).value,
                rapidLabel: document.querySelector(DOMstrings.inputPayFreq).options[document.querySelector(DOMstrings.inputPayFreq).selectedIndex].innerHTML.includes("Rapid")


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
                newEl.innerHTML = `Your Payment is <strong>$ ${pmt.toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</strong>`;
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
            newEl.setAttribute('class', 'Mortgage-Amort-Table table table-striped');
          
            
            html = `
                <table class="amortizationSchedule" style="margin:auto">
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
                `
                newEl.innerHTML = html;
            el.parentNode.replaceChild(newEl, el);

        },


        getDOMstrings: function () {
            return DOMstrings;
        },

        addChart: function (numOfPayment,balance,num) {
          
            var ctx = document.getElementById("myChart");

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
                            scaleLabel: {
                                display: true,
                                labelString: 'Number of Payments'
                            }
                        }],
                        yAxes: [{
                            display: true,
                            scaleLabel: {
                                display: true,
                                labelString: 'Remaining Mortgage Principal'
                            }
                        }]
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
        console.log(input.rapidLabel);
        console.log(input.payFreq);
        newItem = budgetCtrl.ltvRatio(input.mtgValue, input.propValue);
        
        
        if (input.amortPeriod > 0 && !input.rapidLabel) {
            ratePerPayment = budgetCtrl.ratePerPayment(input.interestRate, 2, input.payFreq);
            newItem = -budgetCtrl.PMT(
                ratePerPayment,
                input.amortPeriod * input.payFreq,
                input.mtgValue,
                0, 0).toFixed(2);
        }
        else if (input.rapidLabel && input.payFreq == 26 ) { //Rapid Bi-Weekly
            //ratePerPayment = //budgetCtrl.ratePerPayment(input.interestRate, 2, input.payFreq);
            ratePerPayment = (((1+input.interestRate*0.01/2)**(2/12))-1)
            console.log(ratePerPayment);
            newItem = -budgetCtrl.PMT(
                ratePerPayment,
                input.amortPeriod * 12,
                input.mtgValue/2,
                0, 0).toFixed(2);
                ratePerPayment = budgetCtrl.ratePerPayment(input.interestRate, 2, input.payFreq);
        }
        else if (input.rapidLabel && input.payFreq == 52 ) { //Rapid Weekly
            ratePerPayment = (((1+input.interestRate*0.01/2)**(2/12))-1)
            console.log(ratePerPayment);
            newItem = -budgetCtrl.PMT(
                ratePerPayment,
                input.amortPeriod * 12,
                input.mtgValue/4,
                0, 0).toFixed(2);
                ratePerPayment = budgetCtrl.ratePerPayment(input.interestRate, 2, input.payFreq);
        }
        else {
            newItem = budgetCtrl.interestOnlyPmt(input.interestRate, input.payFreq, input.mtgValue);
        }
        console.log(newItem);
        //3. Add the item to the UI
        //UICtrl.addLtv(newItem);
        UICtrl.addPmt(newItem);
        //Add the cool chart js chart
        
        
        tableData = budgetCtrl.populateAmortTable(newItem, input.amortPeriod, parseFloat(input.payFreq), input.mtgValue,ratePerPayment);
        UICtrl.addAmortTable(tableData);
        UICtrl.addChart(tableData.totalPeriods,tableData.balance,tableData.id);
    };

    return {
        init: function () {
            setupEventListeners();

        }
    }
})(budgetController, UIController);

controller.init();



