import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [searchWord, setSearchWord] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [totalWords, setTotalWords] = useState(0);

  useEffect(() => {
    // Инициализация Telegram WebApp
    WebApp.ready();
    WebApp.expand();
  }, []);

  const handleMessageChange = (e) => {
    const text = e.target.value;
    setMessage(text);
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setTotalWords(words.length);
    if (searchWord) {
      countSpecificWord(text, searchWord);
    }
  };

  const handleSearchWordChange = (e) => {
    const word = e.target.value;
    setSearchWord(word);
    if (message) {
      countSpecificWord(message, word);
    }
  };

  const countSpecificWord = (text, word) => {
    if (!word) {
      setWordCount(0);
      return;
    }
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex) || [];
    setWordCount(matches.length);
  };

  return (
    <div className="app">
      <h1>Поиск слова в переписке</h1>
      
      <div className="search-container">
        <input
          type="text"
          value={searchWord}
          onChange={handleSearchWordChange}
          placeholder="Введите слово для поиска..."
          className="search-input"
        />
      </div>

      <div className="text-container">
        <textarea
          value={message}
          onChange={handleMessageChange}
          placeholder="Вставьте текст переписки сюда..."
          rows={10}
          className="message-input"
        />
      </div>

      <div className="stats-container">
        <div className="stat-item">
          <span className="stat-label">Всего слов:</span>
          <span className="stat-value">{totalWords}</span>
        </div>
        {searchWord && (
          <div className="stat-item">
            <span className="stat-label">Найдено слов "{searchWord}":</span>
            <span className="stat-value">{wordCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 