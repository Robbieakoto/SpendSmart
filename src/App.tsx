import { useState, useEffect } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'
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

interface Loan {
  id: number
  name: string
  amount: number
  isPaid: boolean
}

function App() {

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('categories')
    return saved ? JSON.parse(saved) : []
  })
  const [newCategory, setNewCategory] = useState('')
  const [newCategoryBudget, setNewCategoryBudget] = useState('')
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses')
    return saved ? JSON.parse(saved) : []
  })
  const [newExpense, setNewExpense] = useState({ categoryId: 0, amount: '', date: '' })
  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('loans')
    return saved ? JSON.parse(saved) : []
  })
  const [newLoan, setNewLoan] = useState({ name: '', amount: '' })

  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [appPin, setAppPin] = useState<string | null>(() => localStorage.getItem('appPin'))
  const [isLocked, setIsLocked] = useState<boolean>(() => !!localStorage.getItem('appPin'))
  const [pinInput, setPinInput] = useState('')
  const [newAppPin, setNewAppPin] = useState('')

  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [currentRealDate, setCurrentRealDate] = useState(today)
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null)
  const [editingExpenseAmount, setEditingExpenseAmount] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'budgets' | 'expenses' | 'calendar' | 'loans' | 'settings'>(() => {
    const saved = localStorage.getItem('activeTab') as 'overview' | 'budgets' | 'expenses' | 'calendar' | 'loans' | 'settings' | null
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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        const userRef = doc(db, 'users', u.uid)

        try {
          const snap = await getDoc(userRef)
          if (!snap.exists()) {
            // First time login - perform migration from local storage
            const localCat = JSON.parse(localStorage.getItem('categories') || '[]')
            const localExp = JSON.parse(localStorage.getItem('expenses') || '[]')
            const localLoans = JSON.parse(localStorage.getItem('loans') || '[]')

            await setDoc(userRef, {
              categories: localCat,
              expenses: localExp,
              loans: localLoans
            })
          }

          // Setup snapshot listener
          onSnapshot(userRef, (docSnap) => {
            const data = docSnap.data()
            if (data) {
              setCategories(data.categories || [])
              setExpenses(data.expenses || [])
              setLoans(data.loans || [])
            }
          })
        } catch (error) {
          console.error("Error setting up user data:", error)
        }
      } else {
        setUser(null)
      }
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories))
  }, [categories])

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses))
  }, [expenses])

  useEffect(() => {
    localStorage.setItem('loans', JSON.stringify(loans))
  }, [loans])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      if (now.getMonth() !== currentRealDate.getMonth() || now.getFullYear() !== currentRealDate.getFullYear()) {
        setCurrentRealDate(now)
        setSelectedMonth(now.getMonth())
        setSelectedYear(now.getFullYear())
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [currentRealDate])

  // Check for app updates automatically when the app becomes visible
  useEffect(() => {
    const checkForUpdates = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const response = await fetch('/?t=' + Date.now())
          const html = await response.text()

          const parser = new DOMParser()
          const doc = parser.parseFromString(html, 'text/html')
          const newScripts = Array.from(doc.querySelectorAll('script[type="module"]')).map(s => s.getAttribute('src'))
          const currentScripts = Array.from(document.querySelectorAll('script[type="module"]')).map(s => s.getAttribute('src'))

          // If there's a new script hash in the remote index.html, trigger a reload
          const hasUpdate = newScripts.length > 0 && newScripts.some(src => src && !currentScripts.includes(src))

          if (hasUpdate) {
            window.location.reload()
          }
        } catch (error) {
          // Ignore network errors for background update checks
        }
      }
    }

    document.addEventListener('visibilitychange', checkForUpdates)

    return () => {
      document.removeEventListener('visibilitychange', checkForUpdates)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab)
  }, [activeTab])

  const syncToCloud = async (updates: any) => {
    if (user) {
      await setDoc(doc(db, 'users', user.uid), updates, { merge: true })
    }
  }

  const addCategory = () => {
    const name = newCategory.trim()
    const budget = parseFloat(newCategoryBudget)
    if (name && !categories.some((c) => c.name.toLowerCase() === name.toLowerCase()) && budget > 0) {
      const newCats = [...categories, { id: Date.now(), name, budget }]
      setCategories(newCats)
      syncToCloud({ categories: newCats })
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
      const newExps = [...expenses, expense]
      setExpenses(newExps)
      syncToCloud({ expenses: newExps })
      setNewExpense({ categoryId: 0, amount: '', date: '' })
    }
  }

  const addLoan = () => {
    if (newLoan.name.trim() && newLoan.amount) {
      const loan: Loan = {
        id: Date.now(),
        name: newLoan.name.trim(),
        amount: parseFloat(newLoan.amount),
        isPaid: false
      }
      const newLns = [...loans, loan]
      setLoans(newLns)
      syncToCloud({ loans: newLns })
      setNewLoan({ name: '', amount: '' })
    }
  }

  const markLoanPaid = (id: number) => {
    const newLns = loans.map(loan => loan.id === id ? { ...loan, isPaid: true } : loan)
    setLoans(newLns)
    syncToCloud({ loans: newLns })
  }

  const startEditingExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id)
    setEditingExpenseAmount(exp.amount.toString())
  }

  const saveEditedExpense = (id: number) => {
    const amount = parseFloat(editingExpenseAmount)
    if (!isNaN(amount) && amount > 0) {
      const newExps = expenses.map(e => e.id === id ? { ...e, amount } : e)
      setExpenses(newExps)
      syncToCloud({ expenses: newExps })
    }
    setEditingExpenseId(null)
    setEditingExpenseAmount('')
  }

  const cancelEditExpense = () => {
    setEditingExpenseId(null)
    setEditingExpenseAmount('')
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

  const isEditable = (expenseId: number) => {
    const diffTime = Date.now() - expenseId
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    return diffDays <= 2
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

  if (authLoading) {
    return <SplashScreen />
  }

  if (!user) {
    const handleAuth = async () => {
      setAuthError('')
      try {
        if (authMode === 'login') {
          await signInWithEmailAndPassword(auth, email, password)
        } else {
          await createUserWithEmailAndPassword(auth, email, password)
        }
      } catch (err: any) {
        setAuthError(err.message)
      }
    }

    return (
      <div className="app lock-screen-container">
        <div className="lock-card">
          <h2>☁️ Cloud Sync</h2>
          <p>{authMode === 'login' ? 'Login to access your synced budget.' : 'Create an account to backup your data.'}</p>
          <div className="lock-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="pin-input"
              style={{ fontSize: '1rem', letterSpacing: 'normal' }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="pin-input"
              style={{ fontSize: '1rem', letterSpacing: 'normal' }}
            />
            {authError && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{authError}</p>}
            <button onClick={handleAuth}>{authMode === 'login' ? 'Login' : 'Register'}</button>
          </div>
          <button
            className="cancel-btn"
            style={{ marginTop: '1rem', background: 'transparent', color: '#666' }}
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
          >
            {authMode === 'login' ? 'Need an account? Register' : 'Have an account? Login'}
          </button>
        </div>
      </div>
    )
  }

  if (isLocked) {
    const handleUnlock = () => {
      if (pinInput === appPin) {
        setIsLocked(false)
        setPinInput('')
      } else {
        alert('Incorrect PIN')
      }
    }
    return (
      <div className="app lock-screen-container">
        <div className="lock-card">
          <h2>🔒 App Locked</h2>
          <p>Please enter your PIN to continue</p>
          <div className="lock-form">
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="****"
              className="pin-input"
            />
            <button onClick={handleUnlock}>Unlock</button>
          </div>
        </div>
      </div>
    )
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
            <div className="summary-card spent-card">
              <p>Spent</p>
              <strong>GHC {totalExpenses.toFixed(2)}</strong>
            </div>
            <div className="summary-card left-card">
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
        <button className={`tab ${activeTab === 'loans' ? 'active' : ''}`} onClick={() => setActiveTab('loans')}>Loans</button>
        <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
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
                              {editingExpenseId === exp.id ? (
                                <span className="exp-edit">
                                  <input
                                    type="number"
                                    value={editingExpenseAmount}
                                    onChange={(e) => setEditingExpenseAmount(e.target.value)}
                                    autoFocus
                                    className="edit-amount-input"
                                  />
                                  <button onClick={() => saveEditedExpense(exp.id)} className="save-btn">Save</button>
                                  <button onClick={cancelEditExpense} className="cancel-btn">Cancel</button>
                                </span>
                              ) : (
                                <div className="exp-amt-container">
                                  <span className="exp-amt">GHC {exp.amount.toFixed(2)}</span>
                                  {isEditable(exp.id) && (
                                    <button onClick={() => startEditingExpense(exp)} className="edit-btn">Edit</button>
                                  )}
                                </div>
                              )}
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

      {activeTab === 'loans' && (
        <section className="section">
          <h3>People Who Owe Me</h3>
          <div className="add-loan">
            <input
              type="text"
              value={newLoan.name}
              onChange={(e) => setNewLoan({ ...newLoan, name: e.target.value })}
              placeholder="Person's name"
            />
            <input
              type="number"
              value={newLoan.amount}
              onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })}
              placeholder="Amount"
            />
            <button onClick={addLoan}>Add Loan</button>
          </div>
          <div className="loans-list-container">
            {loans.length === 0 ? (
              <p className="empty-state">No one owes you money right now.</p>
            ) : (
              <ul className="loans-list expenses">
                {loans.slice().sort((a, b) => b.id - a.id).map(loan => (
                  <li key={loan.id} className={loan.isPaid ? 'loan-paid' : ''}>
                    <div className="loan-info">
                      <span className="exp-cat">{loan.name}</span>
                    </div>
                    <div className="exp-amt-container">
                      <span className="exp-amt">GHC {loan.amount.toFixed(2)}</span>
                      {!loan.isPaid ? (
                        <button onClick={() => markLoanPaid(loan.id)} className="mark-paid-btn">Mark Paid</button>
                      ) : (
                        <span className="paid-badge">Paid</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="section">
          <h3>Settings & Security</h3>
          <div className="settings-card" style={{ marginBottom: '1rem' }}>
            <h4>Cloud Account</h4>
            <div className="settings-action">
              <p>Logged in as: <strong style={{ wordBreak: 'break-all' }}>{user?.email}</strong></p>
              <button onClick={() => signOut(auth)} className="cancel-btn">Logout</button>
            </div>
          </div>
          <div className="settings-card">
            <h4>App Lock (PIN)</h4>
            {appPin ? (
              <div className="settings-action">
                <p>App lock is currently <strong>enabled</strong>.</p>
                <button onClick={() => {
                  setAppPin(null)
                  localStorage.removeItem('appPin')
                }} className="cancel-btn">Remove PIN</button>
              </div>
            ) : (
              <div className="settings-action">
                <p>Set a 4-digit PIN to secure your app data.</p>
                <div className="pin-setup">
                  <input
                    type="password"
                    maxLength={4}
                    value={newAppPin}
                    onChange={(e) => setNewAppPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    className="pin-input"
                  />
                  <button onClick={() => {
                    if (newAppPin.length >= 4) {
                      setAppPin(newAppPin)
                      localStorage.setItem('appPin', newAppPin)
                      setNewAppPin('')
                    } else {
                      alert('PIN must be at least 4 digits')
                    }
                  }}>Set PIN</button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default App