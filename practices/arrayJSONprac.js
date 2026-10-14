const employees = [
{ id: 1, name: "Amit Sharma", department: "HR", salary: 35000 },
{ id: 2, name: "Priya Verma", department: "IT", salary: 50000 },
{ id: 3, name: "Ravi Kumar", department: "Finance", salary: 60000 },
{ id: 4, name: "Neha Singh", department: "IT", salary: 55000 },
{ id: 5, name: "Vikram Patel", department: "HR", salary: 40000 },
{ id: 6, name: "Anjali Mehta", department: "Marketing", salary: 45000 },
{ id: 7, name: "Suresh Reddy", department: "Finance", salary: 70000 },
{ id: 8, name: "Kiran Nair", department: "IT", salary: 48000 },
{ id: 9, name: "Pooja Joshi", department: "Marketing", salary: 42000 },
{ id: 10, name: "Arjun Desai", department: "Finance", salary: 65000 }
];



const employeeName = employees.filter((items)=>{
    console.log(items.name);
}) 


const ITemployees = employees.filter((employee) => employee.department == "IT");
console.log(ITemployees);


const highestSalary = employees.reduce((max , employee)=>{
    return employee.salary > max.salary ? employee : max ; 
},employees[0]);
console.log(highestSalary);


const TotalSalary = employees.reduce((sum , employee)=> sum + employee.salary , 0)
console.log(TotalSalary);


const hrUpdatedSalary = employees.map((employee)=>{
    if(employee.department == "HR"){
        return{ ...employee, salary : employee.salary * 1.10}
    }
    return employee;
});
    hrUpdatedSalary.forEach((employee)=>{
    if(employee.department == "HR"){
        console.log(`Updated Salary of ${employee.name} is ${employee.salary}`);
    }
});


const highemployee = employees.filter((employees)=> employees.salary > 50000);
console.log(highemployee)


const AscOrder = employees.sort((a,b)=> a.salary - b.salary);
AscOrder.forEach((employee)=>{
    console.log(` ${employee.id} : ${employee.name} : ${employee.salary} ${employee.department} `);
})



const Finemployee = employees.filter ((employee)=> employee.department == "Finance");
console.log(Finemployee);

const avvgSalary = Finemployee.reduce((sum , employee)=> sum + employee.salary ,0);
console.log(avvgSalary/Finemployee.length);


const sameemployee = employees.filter ((employee)=> employee.department === employee.department);
console.log(sameemployee);