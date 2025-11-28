import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

export default function Customized({ user, setUser }) {
  const navigate = useNavigate();
  // 다중 선택 상태
  const topicOptions = ['정치','경제','문화','스포츠'];
  const sourceOptions = ['BBC','CNN','NYTimes'];
  const languageOptions = ['한국어','영어'];

  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);

  const toggle = (value, selected, setter) => {
    if (selected.includes(value)) {
      setter(selected.filter((v) => v !== value));
    } else {
      setter([...selected, value]);
    }
  };

  const btnClass = (isActive) =>
    isActive
      ? "px-3 py-1 rounded-full border border-blue-600 bg-blue-600 text-white"
      : "px-3 py-1 rounded-full border hover:bg-gray-50";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} setUser={setUser} logoVariant="default" />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">맞춤 구독 설정</h1>
        <p className="text-gray-600 mb-8">관심 주제, 매체, 언어를 선택해 맞춤형 피드를 구성하세요.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-3">주제</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {topicOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={selectedTopics.includes(t)}
                  className={btnClass(selectedTopics.includes(t))}
                  onClick={() => toggle(t, selectedTopics, setSelectedTopics)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-3">매체</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {sourceOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={selectedSources.includes(s)}
                  className={btnClass(selectedSources.includes(s))}
                  onClick={() => toggle(s, selectedSources, setSelectedSources)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-6 md:col-span-2">
            <h2 className="font-semibold mb-3">언어</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {languageOptions.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={selectedLanguages.includes(l)}
                  className={btnClass(selectedLanguages.includes(l))}
                  onClick={() => toggle(l, selectedLanguages, setSelectedLanguages)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => navigate("/newsfeed")}
          >
            저장
          </button>
          <button className="px-5 py-3 border rounded-lg">취소</button>
        </div>
      </main>
    </div>
  );
}


