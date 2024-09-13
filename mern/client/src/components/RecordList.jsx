import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";

const Record = (props) => (
  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
    <td className="p-4 align-middle">
      <input
        type="checkbox"
        checked={props.isSelected}
        onChange={() => props.toggleSelectRecord(props.record._id)}
      />
    </td>
    <td className="p-4 align-middle">{props.record.name}</td>
    <td className="p-4 align-middle">{props.record.position}</td>
    <td className="p-4 align-middle">{props.record.level}</td>
    <td className="p-4 align-middle">
      <div className="flex gap-2">
        <Link
          className="inline-flex items-center justify-center text-sm font-medium border bg-background hover:bg-slate-100 h-9 rounded-md px-3"
          to={`/edit/${props.record._id}`}
        >
          Edit
        </Link>
        <button
          className="inline-flex items-center justify-center text-sm font-medium border bg-background hover:bg-slate-100 h-9 rounded-md px-3"
          color="red"
          type="button"
          onClick={() => props.deleteRecord(props.record._id)}
        >
          Delete
        </button>
      </div>
    </td>
  </tr>
);

export default function RecordList() {
  const [records, setRecords] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [filter, setFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    async function getRecords() {
      const response = await fetch(`http://localhost:5050/record?level=${filter}`);
      if (!response.ok) {
        console.error("An error occurred:", response.statusText);
        return;
      }
      const records = await response.json();
      setRecords(records);
    }
    getRecords();
  }, [filter]);

  const filteredRecords = records.filter((record) => {
    return (
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const toggleSelectRecord = (id) => {
    setSelectedRecords((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((recordId) => recordId !== id)
        : [...prevSelected, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map((record) => record._id));
    }
    setSelectAll(!selectAll);
  };

  const handleDeleteSelected = async () => {
    for (let id of selectedRecords) {
      await fetch(`http://localhost:5050/record/${id}`, {
        method: "DELETE",
      });
    }
    setRecords(records.filter((record) => !selectedRecords.includes(record._id)));
    setSelectedRecords([]);
    setSelectAll(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      setPreviewData(jsonData.slice(0, 10));
      setExcelData(jsonData);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleUploadData = async () => {
    setUploadStatus("Uploading...");

    try {
      const promises = [];

      for (let row of excelData) {
        promises.push(
          fetch("http://localhost:5050/record/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(row),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error("Upload failed");
              }
              return response.json();
            })
            .then((json) => {
              console.log("Uploaded row:", json);
              setRecords((prevRecords) => [...prevRecords, json]);
            })
        );
      }

      await Promise.all(promises);
      setUploadStatus("Success: All data uploaded");
    } catch (error) {
      setUploadStatus("Error: Failed to upload some or all data");
      console.error("Upload Error:", error);
    }
  };


  // This method will delete a record
  async function deleteRecord(id) {
    await fetch(`http://localhost:5050/record/${id}`, {
      method: "DELETE",
    });
    const newRecords = records.filter((el) => el._id !== id);
    setRecords(newRecords);
  }




  const recordList = () => {
    return filteredRecords.map((record) => (
      <Record
        key={record._id}
        record={record}
        isSelected={selectedRecords.includes(record._id)}
        toggleSelectRecord={toggleSelectRecord}
        deleteRecord={deleteRecord}
      />
    ));
  };

  return (
    <>
      <h3 className="text-lg font-semibold p-4">Employee Records</h3>

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by name or position"
        className="p-2 border border-gray-300 rounded mb-4"
      />

      <div>
        <label>Filter by Level:</label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">All</option>
          <option value="Intern">Intern</option>
          <option value="Junior">Junior</option>
          <option value="Senior">Senior</option>
        </select>
      </div>

      <div className="my-4">
        <button
          className="px-4 py-2 bg-red-500 text-white rounded"
          onClick={handleDeleteSelected}
          disabled={selectedRecords.length === 0}
        >
          Delete Selected
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b">
                <th className="h-12 px-4">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="h-12 px-4">Name</th>
                <th className="h-12 px-4">Position</th>
                <th className="h-12 px-4">Level</th>
                <th className="h-12 px-4">Action</th>
              </tr>
            </thead>
            <tbody>{recordList()}</tbody>
          </table>
        </div>
      </div>

      <div>{uploadStatus}</div>

      <form
        onSubmit={handleFileUpload}
        className="border rounded-lg overflow-hidden p-4"
      >
        <div>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
          <h3>Preview of First 10 Rows:</h3>
          <table>
            <thead>
              <tr>
                {previewData.length > 0 &&
                  Object.keys(previewData[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, i) => (
                    <td key={i}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="submit"
          className="block flex-1 bg-blue-500 text-white py-1.5 pl-1 rounded sm:text-sm"
          onClick={handleUploadData}
        >
          Upload Excel
        </button>
      </form>
    </>
  );
}