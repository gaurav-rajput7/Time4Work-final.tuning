(function () {
  function escapeICS(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r\n|\r|\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function unescapeICS(value) {
    return String(value || "").replace(/\\([\\,;nN])/g, function (_, character) {
      return character.toLowerCase() === "n" ? "\n" : character;
    });
  }

  function foldICSLine(line) {
    var pieces = [], current = "", bytes = 0;
    Array.from(line).forEach(function (character) {
      var size = new TextEncoder().encode(character).length;
      if (bytes + size > 73) {
        pieces.push(current);
        current = " " + character;
        bytes = size + 1;
      } else {
        current += character;
        bytes += size;
      }
    });
    pieces.push(current);
    return pieces.join("\r\n");
  }

  function formatICSDate(dateValue, timeValue) {
    var date = localDate(dateValue + (timeValue ? "T" + timeValue : ""));
    var day = date.getFullYear() + String(date.getMonth() + 1).padStart(2, "0") + String(date.getDate()).padStart(2, "0");
    return timeValue
      ? day + "T" + String(date.getHours()).padStart(2, "0") + String(date.getMinutes()).padStart(2, "0") + "00"
      : day;
  }

  function exportCalendar() {
    try {
      var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Time4Work//Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
      S.events.forEach(function (event) {
        if (!event.date) return;
        var allDay = !event.time;
        lines.push("BEGIN:VEVENT");
        lines.push("UID:" + escapeICS(event.uid || event.id + "@time4work"));
        lines.push("DTSTAMP:" + stamp);
        lines.push((allDay ? "DTSTART;VALUE=DATE:" : "DTSTART:") + formatICSDate(event.date, event.time));
        var end = localDate(event.date + (event.time ? "T" + event.time : ""));
        if (event.time) end.setHours(end.getHours() + 1);
        else end.setDate(end.getDate() + 1);
        var endDate = end.getFullYear() + String(end.getMonth() + 1).padStart(2, "0") + String(end.getDate()).padStart(2, "0");
        var endValue = event.time
          ? endDate + "T" + String(end.getHours()).padStart(2, "0") + String(end.getMinutes()).padStart(2, "0") + "00"
          : endDate;
        lines.push((allDay ? "DTEND;VALUE=DATE:" : "DTEND:") + endValue);
        lines.push("SUMMARY:" + escapeICS(event.title));
        if (event.notes) lines.push("DESCRIPTION:" + escapeICS(event.notes));
        if (["daily", "weekly", "monthly"].indexOf(event.recurrence) >= 0) {
          var rule = "RRULE:FREQ=" + event.recurrence.toUpperCase();
          if (event.recurrenceEnd) rule += ";UNTIL=" + event.recurrenceEnd.replace(/-/g, "");
          lines.push(rule);
        }
        lines.push("END:VEVENT");
      });
      S.tasks.filter(function (task) { return !!task.due; }).forEach(function (task) {
        var due = String(task.due).slice(0, 10), time = String(task.due).length > 10 ? String(task.due).slice(11, 16) : "";
        lines.push("BEGIN:VTODO");
        lines.push("UID:" + escapeICS(task.uid || task.id + "@time4work"));
        lines.push("DTSTAMP:" + stamp);
        lines.push((time ? "DUE:" : "DUE;VALUE=DATE:") + formatICSDate(due, time));
        lines.push("SUMMARY:" + escapeICS(task.title));
        if (task.description) lines.push("DESCRIPTION:" + escapeICS(task.description));
        lines.push("STATUS:" + (task.done ? "COMPLETED" : "NEEDS-ACTION"));
        lines.push("PRIORITY:" + ({ high: 3, medium: 5, low: 7 }[task.priority] || 5));
        if (["daily", "weekly", "monthly"].indexOf(task.recurrence) >= 0) {
          var rule = "RRULE:FREQ=" + task.recurrence.toUpperCase();
          if (task.recurrenceEnd) rule += ";UNTIL=" + task.recurrenceEnd.replace(/-/g, "");
          lines.push(rule);
        }
        lines.push("END:VTODO");
      });
      lines.push("END:VCALENDAR");
      var content = lines.map(foldICSLine).join("\r\n") + "\r\n";
      var url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
      var link = document.createElement("a");
      link.href = url;
      link.download = "time4work-calendar-" + key(new Date()) + ".ics";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast("Calendar export downloaded");
    } catch (error) {
      toast("Calendar export nahi ho paya");
    }
  }

  function parseICSDate(value) {
    var match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(String(value || "").trim());
    if (!match) return null;
    var year = +match[1], month = +match[2], day = +match[3], hour = +(match[4] || 0), minute = +(match[5] || 0), second = +(match[6] || 0);
    if (month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate() || hour > 23 || minute > 59 || second > 59) return null;
    var date = match[7]
      ? new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0)))
      : new Date(+match[1], +match[2] - 1, +match[3], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
    if (isNaN(date.getTime())) return null;
    return {
      date: key(date),
      time: match[4] ? String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") : "",
    };
  }

  function parseICS(text) {
    var lines = String(text || "").replace(/^\uFEFF/, "").replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
    var imported = [], current = null, inAlarm = false;
    lines.forEach(function (line) {
      if (line === "BEGIN:VEVENT" || line === "BEGIN:VTODO") { current = { component: line.slice(6) }; inAlarm = false; return; }
      if (line === "END:VEVENT" || line === "END:VTODO") {
        var due = current && (current.due || current.start);
        if (current && due && current.summary) {
          var rule = current.rule || "", frequency = /(?:^|;)FREQ=(DAILY|WEEKLY|MONTHLY)(?:;|$)/i.exec(rule);
          var until = /(?:^|;)UNTIL=(\d{8})/i.exec(rule), end = until ? parseICSDate(until[1]) : null;
          var shared = {
            id: recordId(),
            uid: cleanText(current.uid, 200),
            title: cleanText(unescapeICS(current.summary), 200) || "Untitled item",
            recurrence: frequency ? frequency[1].toLowerCase() : "none",
            recurrenceEnd: end ? end.date : "",
          };
          if (current.component === "VTODO") {
            imported.push(Object.assign(shared, {
              kind: "task",
              due: due.date + (due.time ? "T" + due.time : ""),
              description: cleanText(unescapeICS(current.description || ""), 2000),
              priority: current.priority <= 3 ? "high" : current.priority >= 6 ? "low" : "medium",
              done: current.status === "COMPLETED",
              created: key(new Date()),
              completed: current.status === "COMPLETED" ? key(new Date()) : "",
            }));
          } else {
            imported.push(Object.assign(shared, {
              kind: "event",
              date: due.date,
              time: due.time,
              type: "event",
              notes: cleanText(unescapeICS(current.description || ""), 1000),
            }));
          }
        }
        current = null;
        inAlarm = false;
        return;
      }
      if (!current) return;
      if (line === "BEGIN:VALARM") { inAlarm = true; return; }
      if (line === "END:VALARM") { inAlarm = false; return; }
      if (inAlarm) return;
      var colon = line.indexOf(":");
      if (colon < 0) return;
      var name = line.slice(0, colon).split(";")[0].toUpperCase();
      var value = line.slice(colon + 1);
      if (name === "UID") current.uid = value;
      else if (name === "SUMMARY") current.summary = value;
      else if (name === "DESCRIPTION") current.description = value;
      else if (name === "DTSTART") current.start = parseICSDate(value);
      else if (name === "DUE") current.due = parseICSDate(value);
      else if (name === "STATUS") current.status = value.toUpperCase();
      else if (name === "PRIORITY") current.priority = Number(value) || 5;
      else if (name === "RRULE") current.rule = value;
    });
    return imported;
  }

  function importCalendarFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast("Calendar file 5 MB se chhoti honi chahiye");
    var reader = new FileReader();
    reader.onerror = function () { toast("Calendar file read nahi ho payi"); };
    reader.onload = function () {
      try {
        var text = String(reader.result || "");
        if (!/BEGIN:VCALENDAR/i.test(text) || !/END:VCALENDAR/i.test(text)) throw new Error("Invalid calendar");
        var incoming = parseICS(text).filter(function (item) {
          if (item.kind === "task") {
            return !S.tasks.some(function (existing) {
              return item.uid && existing.uid === item.uid || existing.title === item.title && existing.due === item.due;
            });
          }
          return !S.events.some(function (existing) {
            return item.uid && existing.uid === item.uid || existing.title === item.title && existing.date === item.date && existing.time === item.time;
          });
        }).slice(0, 500);
        if (!incoming.length) return toast("No new calendar items found");
        var importedEvents = incoming.filter(function (item) { return item.kind === "event"; }).map(function (item) { var copy = Object.assign({}, item); delete copy.kind; return copy; });
        var importedTasks = incoming.filter(function (item) { return item.kind === "task"; }).map(function (item) { var copy = Object.assign({}, item); delete copy.kind; return copy; });
        ask("Import " + incoming.length + " calendar item" + (incoming.length === 1 ? "" : "s") + "?", 0, function () {
          S.events = S.events.concat(importedEvents).slice(0, 2000);
          S.tasks = S.tasks.concat(importedTasks).slice(0, 2000);
          sv();
          render();
          toast(incoming.length + " calendar item" + (incoming.length === 1 ? "" : "s") + " imported");
        }, 1);
      } catch (error) {
        toast("Ye valid iCalendar (.ics) file nahi hai");
      }
    };
    reader.readAsText(file);
  }

  window.calendarExportICS = exportCalendar;
  window.calendarImportICS = importCalendarFile;

  document.addEventListener("change", function (event) {
    var input = event.target;
    if (!input || input.id !== "calendar-import-file") return;
    var file = input.files && input.files[0];
    input.value = "";
    if (file) importCalendarFile(file);
  });
})();
