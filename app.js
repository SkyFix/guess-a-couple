const settings = {
  container: null,
  ObjectRemoteStorage: null,
  ObjectLocalStorage: null,
  objectDOMElements: null,
  endtime: null,
  startTime: null,
  clockElemDom: null,
  hoursElemDom: null,
  minutesElemDom: null,
  secondsElemDom: null,

  defaultData: {
    key: 'Guest',
    numCards: 8,
    numMisses: 0,
    numWins: 0,
    numGuessedPairs: 0,
  },
  arrLevelsGame: [8, 16, 32],
  arrPairsCards: [],
  arrOpenCards: [],
  timerId: null,
  countdownTime: 120,
  isPaused: false,
  selectItemsArr: [],
};

const app = {
  settings,
  init(userSettings = {}) {
    Object.assign(this.settings, userSettings);
    // Получаем в переменную контейнер для игры
    this.settings.container = document.getElementById('app');
    // Получаем в переменную LocalStorage
    this.settings.ObjectRemoteStorage = window.localStorage;
    // Получаем в переменную объект с созданными элементами DOM
    this.settings.objectDOMElements = this.createApp(this.settings.container);
    const ObjDom = this.settings.objectDOMElements;
    this.settings.ObjectLocalStorage = this.settings.defaultData;
    // При инициализации удаляем старые данные
    const arrItems = ObjDom.list.querySelectorAll('.list__item');
    arrItems.forEach((item) => {
      item.remove();
    });
    // Получаем конечное время таймера от которого будет производиться отсчет времени
    this.settings.endtime = this.getEndTime();
    this.settings.startTime = this.settings.endtime;
    // Инициализация таймера
    this.initTimer();
    // Вешаем обработчик события KEYUP на поле ввода имени
    ObjDom.inputStartName.addEventListener('keyup', (e) => {
      // Необходимо проверить если есть такой игрок в базе
      // если есть  то заменить локальные данные на удаленные
      if (e.code === 'Enter') {
        this.setSettings();
        // Проходим по кнопкам и ставим checked на кнопке из базы
        ObjDom.radioGroup.querySelectorAll('.radio_input').forEach((elem) => {
          if (elem.value === this.settings.ObjectLocalStorage.numCards) {
            elem.checked = true;
          }
        });
        ObjDom.leftSide.append(ObjDom.currentGamer);
        ObjDom.leftSide.append(ObjDom.numGuessedPairs);
        ObjDom.leftSide.append(ObjDom.numMisses);
        ObjDom.leftSide.append(ObjDom.numWins);
        ObjDom.inputStartName.remove();
        ObjDom.inputOverlay.remove();
        ObjDom.buttonRun.style.display = 'flex';
      }
    });
    // Вешаем обработчик события клик на кнопку запустить игру
    ObjDom.buttonRun.addEventListener('click', (e) => {
      this.settings.isPaused = false;
      // Создали массив карт
      this.createPairsCards();
      // Перемешиваем массив карт
      this.shuffleArray(this.settings.arrPairsCards);
      // Отрисовываем карты
      this.settings.arrPairsCards.forEach((element) => {
        ObjDom.list.append(this.createItem(element.idCard));
      });
      // прячем кнопку запустить
      e.target.style.display = 'none';
      // показываем кнопку закончить
      ObjDom.buttonOver.style.display = 'flex';
      // Запускаем таймер
      this.settings.endtime = this.getEndTime();
      this.settings.timerId = setInterval(() => {
        if (!this.settings.isPaused) {
          this.updateClock(this.settings.endtime);
        }
      }, 1000);
      const cards = document.querySelectorAll('.list__item');
      // Массив для двух выбранных карт
      const selectItemsArr = [];
      cards.forEach((card) => {
        card.addEventListener('click', () => {
          // Если массив еще не заполнен - заполняем
          if (selectItemsArr.length < 2 && !card.classList.contains('list__item_perfect')) {
            card.classList.add('list__item_flip');
            selectItemsArr.push(card);
            // Если массив заполнен
            if (selectItemsArr.length === 2) {
              this.compareCards(selectItemsArr);
            }
          }
        });
      });
    });
    // Вешаем обработчик события клик на кнопку закончить игру
    ObjDom.buttonOver.addEventListener('click', (e) => {
      // Находим все элементы(карты) на странице и удаляем
      const items = document.querySelectorAll('.list__item');
      items.forEach((item) => {
        item.remove();
      });
      this.settings.arrPairsCards.length = 0; // очищаем массив
      e.target.style.display = 'none'; // прячем кнопку закончить
      ObjDom.buttonRun.style.display = 'flex'; // показываем кнопку запустить
      // Останавливаем таймер
      this.resetTimer();
      // И передать данные в статистику
      this.settings.isPaused = false;
    });
    // Вешаем обработчик события клик на кнопку сохранить настройки
    ObjDom.buttonSave.addEventListener('click', () => {
      // Выставляем текущий выбранный уровень сложности в переменную numCards
      this.setLevelGame();
      // Сохраняем настройки
      this.saveSettings();
      // Обнуляем игру
      this.resetGame();
    });
  },
  // Метод сравнивает карты и если они равны
  compareCards(selectItemsArr) {
    // сравниваем полученные две карты по ID
    if (selectItemsArr[0].getAttribute('data-id') !== selectItemsArr[1].getAttribute('data-id')) {
      setTimeout(() => {
        // Если карты не равны тогда убираем с них css class
        selectItemsArr[0].classList.remove('list__item_flip');
        selectItemsArr[1].classList.remove('list__item_flip');
        ++this.settings.ObjectLocalStorage.numMisses;
        selectItemsArr.length = 0; // очищаем массив для следующих карт
      }, 1000);
    // иначе добавляем две этих карточки в массив открытых карт
    // И добавляем картам css class
    } else {
      selectItemsArr[0].classList.add('list__item_perfect');
      selectItemsArr[1].classList.add('list__item_perfect');
      ++this.settings.ObjectLocalStorage.numGuessedPairs;
      this.settings.arrOpenCards.push(selectItemsArr[0], selectItemsArr[1]);
      selectItemsArr.length = 0; // очищаем массив для следующих карт
    }
  },
  countTimeDiff(startTime, endtime) {
    return Date.parse(startTime) - Date.parse(endtime);
  },
  resetGame() {
    const ObjDom = this.settings.objectDOMElements;
    // Находим все элементы(карты) на странице и удаляем
    const items = document.querySelectorAll('.list__item');
    items.forEach((item) => {
      item.remove();
    });
    // очищаем массив карт
    this.settings.arrPairsCards.length = 0;
    // Массив открытых карт очищаем
    this.settings.arrOpenCards.length = 0;
    // прячем кнопку закончить
    ObjDom.buttonOver.style.display = 'none';
    // показываем кнопку запустить
    ObjDom.buttonRun.style.display = 'flex';
  },
  // Метод устанавливает настройки
  setSettings() {
    const ObjDom = this.settings.objectDOMElements;
    const objRS = this.settings.ObjectRemoteStorage;
    let objLS = this.settings.ObjectLocalStorage;
    const key = ObjDom.inputStartName.value;

    if (key && objRS.getItem(key)) {
      objLS = JSON.parse(objRS.getItem(key));
      this.settings.ObjectLocalStorage = objLS;
    } else if (key && !objRS.getItem(key)) {
      objLS = this.settings.defaultData; // заполняем объект дефолт настройками
      objLS.key = key; // присваиваем объекту введенное имя
      this.settings.ObjectLocalStorage = objLS;
      objRS.setItem(key, JSON.stringify(objLS)); // Отправляем обьект в localStorage
    } else {
      objLS = this.settings.defaultData; // заполняем объект дефолт настройками
      this.settings.ObjectLocalStorage = objLS;
      objRS.setItem(objLS.key, JSON.stringify(objLS)); // Отправляем обьект в localStorage
    }
    this.updateStatictics(this.settings.ObjectLocalStorage);
  },
  // Метод сохраняет настройки
  saveSettings() {
    const ObjDom = this.settings.objectDOMElements;
    const objRS = this.settings.ObjectRemoteStorage;
    let objLS = this.settings.ObjectLocalStorage;
    const key = ObjDom.inputSettingsName.value;
    const data = this.settings.defaultData;

    if (!key) {
      objRS.setItem(objLS.key, JSON.stringify(objLS));
      // если есть значение но нет такого пользователя - создаем нового
    } else if (key && !objRS.getItem(key)) {
      objLS = this.settings.defaultData; // создаём объект с default настройками
      objLS.key = key; // присваиваем объекту новый введенный ключ
      this.settings.ObjectLocalStorage = objLS;
      objRS.setItem(key, JSON.stringify(objLS));
    } else if (key && objRS.getItem(key)) {
      objLS.key = key;
      objRS.setItem(key, JSON.stringify(objLS));
      this.settings.ObjectLocalStorage = objLS;
    } else if (key && objRS.getItem(data.key)) {
      objRS.setItem(key, JSON.stringify(objLS));
    }
    this.updateStatictics(this.settings.ObjectLocalStorage);
  },
  // Метод создаёт каркас игры
  createApp() {
    const leftSide = document.createElement('div');
    leftSide.classList.add('side');
    const leftSideTitle = document.createElement('h2');
    leftSideTitle.classList.add('side__title');
    leftSideTitle.textContent = 'Statistics';
    const currentGamer = document.createElement('span');
    const timerTitle = document.createElement('span');
    timerTitle.textContent = 'Оставшееся время:';
    const timer = document.createElement('div');
    timer.id = 'timer';
    timer.classList.add('timer');
    const numGuessedPairs = document.createElement('span');
    const numMisses = document.createElement('span');
    const numWins = document.createElement('span');

    const rightSide = document.createElement('div');
    rightSide.classList.add('side');
    const rightSideTitle = document.createElement('h2');
    rightSideTitle.classList.add('side__title');
    rightSideTitle.textContent = 'Settings';
    const inputSettingsName = document.createElement('input');
    inputSettingsName.classList.add('inputName');
    inputSettingsName.placeholder = 'Введите имя...';
    const levels = document.createElement('span');
    levels.textContent = 'choose the difficulty level:';
    const radioGroup = document.createElement('div');
    radioGroup.classList.add('form_radio_group');
    const buttonSave = document.createElement('button');
    buttonSave.classList.add('btn', 'btn_save');
    buttonSave.textContent = 'Save settings';

    const inputStartName = document.createElement('input');
    inputStartName.classList.add('inputName');
    inputStartName.placeholder = 'Как Вас зовут?';
    const inputOverlay = document.createElement('div');
    inputOverlay.classList.add('overlay');

    const list = document.createElement('ul');
    list.classList.add('list');
    const item = document.createElement('li');
    item.classList.add('list__item');
    const buttonRun = document.createElement('button');
    buttonRun.classList.add('btn', 'btn_run');
    buttonRun.textContent = 'run game';
    const buttonOver = document.createElement('button');
    buttonOver.classList.add('btn', 'btn_over');
    buttonOver.textContent = 'exit game';

    // Рисуем список уровней сложности
    this.settings.arrLevelsGame.forEach((e) => {
      const radioItem = document.createElement('div');
      radioItem.classList.add('form_radio_group-item');
      const radioInput = document.createElement('input');
      radioInput.id = e;
      radioInput.type = 'radio';
      radioInput.name = 'level';
      radioInput.value = e;
      radioInput.classList.add('radio_input');
      radioItem.append(radioInput);
      const radioLabel = document.createElement('label');
      radioLabel.setAttribute('for', e);

      switch (e) {
        case 8: radioLabel.textContent = 'Easy';
          radioInput.checked = true; break;
        case 16: radioLabel.textContent = 'Medium'; break;
        case 32: radioLabel.textContent = 'Hard'; break;
        default: radioLabel.textContent = 'Easy';
      }
      radioItem.append(radioLabel);
      radioGroup.append(radioItem);
    });
    const arrTimer = [
      {
        classBlock1: 'hours',
        classBlock2: 'countdown-time',
      },
      {
        classBlock1: 'minutes',
        classBlock2: 'countdown-time',
      },
      {
        classBlock1: 'seconds',
        classBlock2: 'countdown-time',
      },
    ];
    // Рисуем таймер
    for (let i = 0; i < arrTimer.length; i++) {
      const wrapCountdown = document.createElement('div');
      wrapCountdown.classList.add('timer__pair');
      const block = document.createElement('span');
      block.classList.add(arrTimer[i].classBlock1, arrTimer[i].classBlock2);
      wrapCountdown.append(block);
      timer.append(wrapCountdown);
    }
    rightSide.append(rightSideTitle);
    rightSide.append(inputSettingsName);
    rightSide.append(levels);
    rightSide.append(radioGroup);
    rightSide.append(buttonSave);
    leftSide.append(leftSideTitle);
    leftSide.append(timerTitle);
    leftSide.append(timer);
    this.settings.container.append(leftSide);
    this.settings.container.append(list);
    this.settings.container.append(rightSide);
    this.settings.container.append(buttonRun);
    this.settings.container.append(buttonOver);
    inputOverlay.append(inputStartName);
    this.settings.container.append(inputOverlay);
    return {
      list,
      item,
      buttonRun,
      buttonOver,
      buttonSave,
      inputSettingsName,
      radioGroup,
      leftSide,
      inputStartName,
      inputOverlay,
      currentGamer,
      numGuessedPairs,
      numMisses,
      numWins,
    };
  },
  // Метод создаёт карту
  createItem(numCard) {
    const item = document.createElement('li');
    item.classList.add('list__item');
    item.setAttribute('data-id', numCard);
    const itemFront = document.createElement('div');
    itemFront.classList.add('list__item_front');
    const itemBack = document.createElement('div');
    itemBack.classList.add('list__item_back');
    item.append(itemFront);
    item.append(itemBack);
    return item;
  },
  // Метод устанавливает уровень сложности игры и записывает в NUMCARDS
  setLevelGame() {
    document.querySelectorAll('.radio_input').forEach((element) => {
      if (element.checked) {
        this.settings.ObjectLocalStorage.numCards = element.value;
      }
    });
  },
  // Метод перемешивает массив карт
  shuffleArray(array) {
    let i = array.length;
    let k;
    let temp;

    while (--i > 0) {
      k = Math.floor(Math.random() * (i + 1));
      temp = array[k];
      array[k] = array[i];
      array[i] = temp;
    }
  },
  // Метод создает два объекта(пару карт) и записывает в массив карт
  createPairsCards() {
    // на каждой итерации делается проверка - если число четное то создаем пару
    for (let i = 1; i <= this.settings.ObjectLocalStorage.numCards; i++) {
      if (i % 2 === 0) {
        const obj = { idCard: i, valueCard: i };
        this.settings.arrPairsCards.push(obj, obj);
      }
    }
  },
  // Метод обновляет данные DOM элементов
  // obj  -передаём объект с данными или LS или DefaultData
  updateStatictics(data = this.settings.defaultData) {
    const objDOM = this.settings.objectDOMElements;
    objDOM.currentGamer.textContent = `Игрок: ${data.key}`;
    objDOM.numGuessedPairs.textContent = `Количество угаданных пар: ${data.numGuessedPairs}`;
    objDOM.numMisses.textContent = `Количество промахов: ${data.numMisses}`;
    objDOM.numWins.textContent = `Количество побед: ${data.numWins}`;
  },
  // Метод высчитывает время обратного отсчета и возвращает его
  getEndTime() {
    return new Date(Date.parse(new Date()) + this.settings.countdownTime * 1000);
  },
  // Метод инициализирует таймер
  initTimer() {
    // Получаем элементы Dom для часов, минут и секунд
    this.settings.clockElemDom = document.getElementById('timer');
    this.settings.hoursElemDom = document.querySelector('.hours');
    this.settings.minutesElemDom = document.querySelector('.minutes');
    this.settings.secondsElemDom = document.querySelector('.seconds');
    // Запускаем update и отрисовываем время
    this.updateClock();
  },
  // Метод обновления времени таймера
  updateClock() {
    const t = Date.parse(this.settings.endtime) - Date.parse(new Date());
    // Отрисовываем время
    this.settings.hoursElemDom.innerHTML = (`0${this.getTime(t).hours}`).slice(-2);
    this.settings.minutesElemDom.innerHTML = (`0${this.getTime(t).minutes}`).slice(-2);
    this.settings.secondsElemDom.innerHTML = (`0${this.getTime(t).seconds}`).slice(-2);

    if (t === 0) {
      this.resetTimer();
      this.resetGame();
      const msgLose = setTimeout(() => {
        alert('Вы проиграли!Время вышло!!!');
        clearTimeout(msgLose);
      }, 500);
    } else if (this.settings.arrOpenCards.length === +this.settings.ObjectLocalStorage.numCards) {
      this.setMessage();
    }
  },
  setMessage() {
    const msgWin = setTimeout(() => {
      alert('Вы выиграли!!!');
      clearTimeout(msgWin);
    }, 500);
    ++this.settings.ObjectLocalStorage.numWins;
    this.countTimeDiff(this.settings.startTime, this.settings.endtime);
    this.resetGame();
    this.updateStatictics(this.settings.ObjectLocalStorage);
    // Отправляем данные  в LocalStorage
    this.settings.ObjectRemoteStorage.setItem(
      this.settings.ObjectLocalStorage.key,
      JSON.stringify(this.settings.ObjectLocalStorage),
    );
    this.resetTimer();
  },
  // Метод сбрасывает таймер и возвращает таймер к старому значению
  resetTimer() {
    clearInterval(this.settings.timerId);
    this.settings.hoursElemDom.innerHTML = '00';
    this.settings.minutesElemDom.innerHTML = '00';
    this.settings.secondsElemDom.innerHTML = '00';
    this.settings.isPaused = true;
    this.settings.endtime = this.getEndTime();
  },
  // Метод высчитывает время таймера и возвращает данные объектом
  getTime(endtime) {
    // Высчитываем секунды
    const seconds = Math.floor((endtime / 1000) % 60);
    // Высчитываем минуты
    const minutes = Math.floor((endtime / 1000 / 60) % 60);
    // Высчитываем часы
    const hours = Math.floor((endtime / (1000 * 60 * 60)) % 24);
    return {
      hours,
      minutes,
      seconds,
    };
  },
};
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
