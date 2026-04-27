import { useState, useEffect } from 'react'
import './App.css'
import SplashScreen from './components/SplashScreen'

interface Category {
  id: number
  name: string
  budget: number
}

interface Expense {
  id: number
  categoryId: number
  amount: number
  date: string
}

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [newCategoryBudget, setNewCategoryBudget] = useState('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [newExpense, setNewExpense] = useState({ categoryId: 0, amount: '', date: '' })
  
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('selectedMonth')
    return saved !== null ? parseInt(saved) : today.getMonth()
  })
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = localStorage.getItem('selectedYear')
    return saved !== null ? parseInt(saved) : today.getFullYear()
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'budgets' | 'expenses' | 'calendar'>(() => {
    const saved = localStorage.getItem('activeTab') as 'overview' | 'budgets' | 'expenses' | 'calendar' | null
    return saved || 'overview'
  })

  const [expensesPage, setExpensesPage] = useState(1)
  const [calendarPage, setCalendarPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    setExpensesPage(1)
    setCalendarPage(1)
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    const savedCategories = localStorage.getItem('categories')
    const savedExpenses = localStorage.getItem('expenses')
    if (savedCategories) setCategories(JSON.parse(savedCategories))
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses))
  }, [])

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories))
  }, [categories])

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses))
  }, [expenses])

  useEffect(() => {
    localStorage.setItem('selectedMonth', selectedMonth.toString())
  }, [selectedMonth])

  useEffect(() => {
    localStorage.setItem('selectedYear', selectedYear.toString())
  }, [selectedYear])

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab)
  }, [activeTab])

  const addCategory = () => {
    const name = newCategory.trim()
    const budget = parseFloat(newCategoryBudget)
    if (name && !categories.some((c) => c.name.toLowerCase() === name.toLowerCase()) && budget > 0) {
      setCategories([...categories, { id: Date.now(), name, budget }])
      setNewCategory('')
      setNewCategoryBudget('')
    }
  }

  const addExpense = () => {
    if (newExpense.categoryId && newExpense.amount && newExpense.date) {
      const expense: Expense = {
        id: Date.now(),
        categoryId: newExpense.categoryId,
        amount: parseFloat(newExpense.amount),
        date: newExpense.date,
      }
      setExpenses([...expenses, expense])
      setNewExpense({ categoryId: 0, amount: '', date: '' })
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  const getExpensesForMonth = (expenses: Expense[], month: number, year: number) => {
    return expenses.filter((exp) => {
      const expDate = new Date(exp.date)
      return expDate.getMonth() === month && expDate.getFullYear() === year
    })
  }

  const monthExpenses = getExpensesForMonth(expenses, selectedMonth, selectedYear)

  const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0)
  const totalExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const totalLeft = Math.max(0, totalBudget - totalExpenses)
  const actualPercentUsed = totalBudget ? (totalExpenses / totalBudget) * 100 : 0
  const displayPercentUsed = Math.min(100, actualPercentUsed)

  const getStatusClass = (percent: number) => {
    if (percent >= 100) return 'status-danger'
    if (percent >= 80) return 'status-warning'
    return 'status-safe'
  }

  const spentByCategory = (categoryId: number) =>
    monthExpenses
      .filter((exp) => exp.categoryId === categoryId)
      .reduce((sum, exp) => sum + exp.amount, 0)

  const groupExpensesByDate = (expenses: Expense[]) => {
    const groups: { [key: string]: Expense[] } = {}
    expenses.forEach((exp) => {
      if (!groups[exp.date]) {
        groups[exp.date] = []
      }
      groups[exp.date].push(exp)
    })
    return groups
  }

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />
  }

  return (
    <div className="app">
      <header className="top-card">
        <div className="month-title">
          <small>BUDGET TRACKER</small>
          <div className="month-selector">
            <button onClick={goToPreviousMonth} className="month-nav">←</button>
            <h2>{monthNames[selectedMonth]} {selectedYear}</h2>
            <button onClick={goToNextMonth} className="month-nav">→</button>
          </div>
        </div>
        <div className="budget-summary">
          <div>
            <p>Total Budget</p>
            <h1>GHC {totalBudget.toFixed(2)}</h1>
          </div>
          <div className="summary-cards">
            <div className="summary-card">
              <p>Spent</p>
              <strong>GHC {totalExpenses.toFixed(2)}</strong>
            </div>
            <div className="summary-card">
              <p>Left</p>
              <strong>GHC {totalLeft.toFixed(2)}</strong>
            </div>
          </div>
        </div>
        <div className="progress-box">
          <div className={`progress-circle ${getStatusClass(actualPercentUsed)}`}>
            <div className={`progress-inner ${getStatusClass(actualPercentUsed)}`}>{Math.round(actualPercentUsed)}%</div>
            <div className="progress-fill" style={{ width: `${displayPercentUsed}%` }}></div>
          </div>
          <span className="used-label">Used</span>
        </div>
      </header>

      <nav className="tab-bar">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab ${activeTab === 'budgets' ? 'active' : ''}`} onClick={() => setActiveTab('budgets')}>Analytics</button>
        <button className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>Expenses</button>
        <button className={`tab ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>Calendar</button>
      </nav>

      {activeTab === 'overview' && (
        <section className="section">
          <h3>Categories</h3>
          <div className="add-category">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category name"
            />
            <input
              type="number"
              value={newCategoryBudget}
              onChange={(e) => setNewCategoryBudget(e.target.value)}
              placeholder="Budget amount"
            />
            <button onClick={addCategory}>Add Category</button>
          </div>
          <ul className="category-list">
            {categories.map((cat) => {
              const spent = spentByCategory(cat.id)
              const actualProgress = cat.budget ? (spent / cat.budget) * 100 : 0
              const displayProgress = Math.min(100, actualProgress)
              return (
                <li key={cat.id}>
                  <div className="category-name">🍔 {cat.name}</div>
                  <div className="category-values">GHC {spent.toFixed(2)} / GHC {cat.budget.toFixed(2)}</div>
                  <div className="line-progress">
                    <div 
                      className={`line-fill ${getStatusClass(actualProgress)}`} 
                      style={{ width: `${displayProgress}%` }} 
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {activeTab === 'budgets' && (
        <section className="section">
          <h3>Spend Analytics</h3>
          <div className="budget-details">
            {categories.length === 0 ? (
              <p className="empty-state">No categories yet. Add one from the Overview tab.</p>
            ) : (
              <ul className="category-list">
                {categories.map((cat) => {
                  const spent = spentByCategory(cat.id)
                  const actualProgress = cat.budget ? (spent / cat.budget) * 100 : 0
                  const displayProgress = Math.min(100, actualProgress)
                  return (
                    <li key={cat.id}>
                      <div className="category-name">🍔 {cat.name}</div>
                      <div className="category-values">
                        <span className={`percent-tag ${getStatusClass(actualProgress)}`}>
                          {Math.round(actualProgress)}%
                        </span>
                        GHC {spent.toFixed(2)} / GHC {cat.budget.toFixed(2)}
                      </div>
                      <div className="line-progress">
                        <div 
                          className={`line-fill ${getStatusClass(actualProgress)}`} 
                          style={{ width: `${displayProgress}%` }} 
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {activeTab === 'expenses' && (
        <section className="section">
          <h3>Expenses</h3>
          <div className="add-expense">
            <select
              value={newExpense.categoryId}
              onChange={(e) => setNewExpense({ ...newExpense, categoryId: Number(e.target.value) })}
            >
              <option value={0}>Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              placeholder="Amount"
            />
            <input
              type="date"
              value={newExpense.date}
              onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
            />
            <button onClick={addExpense}>Add Expense</button>
          </div>
          <div className="expenses-list-container">
            {monthExpenses.length === 0 ? (
              <p className="empty-state">No expenses yet. Add one above.</p>
            ) : (() => {
              const grouped = Object.entries(groupExpensesByDate(monthExpenses))
                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime());
              const totalPages = Math.ceil(grouped.length / ITEMS_PER_PAGE);
              const paginated = grouped.slice((expensesPage - 1) * ITEMS_PER_PAGE, expensesPage * ITEMS_PER_PAGE);
              
              return (
                <>
                  {paginated.map(([date, group]) => (
                    <div key={date} className="expense-group">
                      <div className="date-header">{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      <ul className="expenses">
                        {group.map((exp) => {
                          const category = categories.find((c) => c.id === exp.categoryId)
                          return (
                            <li key={exp.id}>
                              <span className="exp-cat">{category?.name ?? 'Unknown'}</span>
                              <span className="exp-amt">GHC {exp.amount.toFixed(2)}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button 
                        disabled={expensesPage === 1} 
                        onClick={() => setExpensesPage(prev => prev - 1)}
                        className="page-btn"
                      >
                        Prev
                      </button>
                      <span className="page-info">Page {expensesPage} of {totalPages}</span>
                      <button 
                        disabled={expensesPage === totalPages} 
                        onClick={() => setExpensesPage(prev => prev + 1)}
                        className="page-btn"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </section>
      )}

      {activeTab === 'calendar' && (
        <section className="section">
          <h3>Calendar View</h3>
          <div className="calendar-view">
            {monthExpenses.length === 0 ? (
              <p className="empty-state">No expenses to display.</p>
            ) : (() => {
              const grouped = Object.entries(groupExpensesByDate(monthExpenses))
                .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime());
              const totalPages = Math.ceil(grouped.length / ITEMS_PER_PAGE);
              const paginated = grouped.slice((calendarPage - 1) * ITEMS_PER_PAGE, calendarPage * ITEMS_PER_PAGE);

              return (
                <>
                  {paginated.map(([date, group]) => (
                    <div key={date} className="expense-group">
                      <div className="date-header">{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      <ul className="expenses">
                        {group.map((exp) => {
                          const category = categories.find((c) => c.id === exp.categoryId)
                          return (
                            <li key={exp.id}>
                              <span className="exp-cat">{category?.name ?? 'Unknown'}</span>
                              <span className="exp-amt">GHC {exp.amount.toFixed(2)}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button 
                        disabled={calendarPage === 1} 
                        onClick={() => setCalendarPage(prev => prev - 1)}
                        className="page-btn"
                      >
                        Prev
                      </button>
                      <span className="page-info">Page {calendarPage} of {totalPages}</span>
                      <button 
                        disabled={calendarPage === totalPages} 
                        onClick={() => setCalendarPage(prev => prev + 1)}
                        className="page-btn"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </section>
      )}
    </div>
  )
}

export default App