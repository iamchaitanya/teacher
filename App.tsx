
import React, { useState, useEffect } from 'react';
import { UserRole, TeacherProfile, JobListing, SchoolProfile, ParentProfile, StudentApplication } from './types';
import { Navbar } from './components/Navbar';
import { summarizeProfile, matchJobs } from './services/geminiService';

// Mock Initial Data
const INITIAL_JOBS: JobListing[] = [
  { id: 'j1', schoolId: 's1', title: 'Senior Physics Lead', subject: 'Science', gradeLevel: 'High School', salaryRange: '$60k - $85k', postedAt: '2 days ago', description: 'Seeking a dynamic Physics teacher for our advanced placement program.' },
  { id: 'j2', schoolId: 's2', title: 'Creative Arts Coordinator', subject: 'Art', gradeLevel: 'Middle School', salaryRange: '$55k - $70k', postedAt: '1 week ago', description: 'Lead our arts department across multiple campuses.' },
  { id: 'j3', schoolId: 's1', title: 'Math Instructor', subject: 'Mathematics', gradeLevel: 'Secondary', salaryRange: '$58k - $75k', postedAt: '5 hours ago', description: 'Looking for experts in Calculus and Statistics.' },
  { id: 'j4', schoolId: 's3', title: 'Early Years Lead', subject: 'Primary', gradeLevel: 'Pre-K', salaryRange: '$45k - $60k', postedAt: '3 days ago', description: 'Join our award-winning early childhood center.' }
];

const INITIAL_TEACHERS: TeacherProfile[] = [
  { id: 't1', name: 'Dr. Sarah Jenkins', subject: 'Physics', experienceYears: 12, education: 'PhD in Theoretical Physics', location: 'London, UK', bio: 'Passionate about making complex science accessible to all students.', skills: ['Physics', 'Python', 'Curriculum Design'], avatar: 'https://picsum.photos/seed/sarah/200' },
  { id: 't2', name: 'James Wilson', subject: 'English', experienceYears: 5, education: 'MA in Creative Writing', location: 'Austin, TX', bio: 'Focus on modern literature and debate.', skills: ['Literature', 'Public Speaking', 'ESL'], avatar: 'https://picsum.photos/seed/james/200' }
];

const INITIAL_PARENTS: ParentProfile[] = [
  { id: 'p1', name: 'Mark Stevenson', location: 'London, UK', childName: 'Leo Stevenson', childGrade: 'Grade 5', avatar: 'https://picsum.photos/seed/parent/200' }
];

const INITIAL_SCHOOLS: SchoolProfile[] = [
  { id: 's1', name: 'Oxford International Academy', location: 'London, UK', type: 'IB World School', bio: 'A premier institution focused on global citizenship and academic excellence.', logo: 'https://picsum.photos/seed/oxford/200', openRoles: [] },
  { id: 's2', name: 'Austin Creative Arts School', location: 'Austin, TX', type: 'Private Charter', bio: 'Nurturing creativity and innovation in the heart of Texas.', logo: 'https://picsum.photos/seed/austin/200', openRoles: [] },
  { id: 's3', name: 'Greenwood Montessori', location: 'San Francisco, CA', type: 'Montessori', bio: 'Holistic education following the traditional Montessori method.', logo: 'https://picsum.photos/seed/greenwood/200', openRoles: [] },
  { id: 's4', name: 'St. Andrews Preparatory', location: 'Edinburgh, UK', type: 'Private Primary', bio: 'Traditional values with a modern, technology-driven approach.', logo: 'https://picsum.photos/seed/andrew/200', openRoles: [] }
];

export default function App() {
  const [role, setRole] = useState<UserRole>(null);
  const [view, setView] = useState<string>('home');
  const [loading, setLoading] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [parentProfile, setParentProfile] = useState<ParentProfile | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>(INITIAL_JOBS);
  const [schools] = useState<SchoolProfile[]>(INITIAL_SCHOOLS);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [studentApplications, setStudentApplications] = useState<StudentApplication[]>([]);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [matchScores, setMatchScores] = useState<Record<string, { score: number, reasoning: string }>>({});
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolCategory, setSchoolCategory] = useState("All");

  const [selectedSchoolForAdmission, setSelectedSchoolForAdmission] = useState<SchoolProfile | null>(null);
  const [admissionForm, setAdmissionForm] = useState({ childName: '', grade: '', statement: '' });

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<TeacherProfile | null>(null);

  // Job form state
  const [newJob, setNewJob] = useState({ title: '', subject: 'Mathematics', salary: '', desc: '' });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleLogout = () => {
    setRole(null);
    setView('home');
    setTeacherProfile(null);
    setParentProfile(null);
    setMatchScores({});
    setIsEditingProfile(false);
  };

  const handleLogin = async (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === 'TEACHER') {
      const profile = INITIAL_TEACHERS[0];
      setTeacherProfile(profile);
      setEditedProfile(profile);
      setView('teacher-dashboard');
      runMatching(profile, jobs);
    } else if (selectedRole === 'PARENT') {
      const profile = INITIAL_PARENTS[0];
      setParentProfile(profile);
      setView('parent-dashboard');
    } else {
      setView('school-dashboard');
    }
  };

  const runMatching = async (profile: TeacherProfile, currentJobs: JobListing[]) => {
    setLoading(true);
    try {
      const results = await matchJobs(profile, currentJobs);
      const scoreMap: Record<string, any> = {};
      results.forEach((r: any) => {
        scoreMap[r.jobId] = { score: r.matchScore, reasoning: r.reasoning };
      });
      setMatchScores(scoreMap);
    } catch (e) {
      console.error("Matching failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeProfile = async () => {
    if (!aiInsight.trim()) return;
    setLoading(true);
    try {
      const result = await summarizeProfile(aiInsight);
      if (teacherProfile) {
        const updatedProfile = { 
          ...teacherProfile, 
          bio: result.bio, 
          skills: [...new Set([...teacherProfile.skills, ...result.skills])] 
        };
        setTeacherProfile(updatedProfile);
        setEditedProfile(updatedProfile);
        setAiInsight("");
        runMatching(updatedProfile, jobs);
      }
    } catch (e) {
      alert("AI optimization failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = () => {
    if (editedProfile) {
      setTeacherProfile(editedProfile);
      setIsEditingProfile(false);
      runMatching(editedProfile, jobs);
    }
  };

  const handlePublishJob = () => {
    if (!newJob.title || !newJob.desc) {
      alert("Please fill in all required fields.");
      return;
    }
    const createdJob: JobListing = {
      id: `j-${Date.now()}`,
      schoolId: 's-own',
      title: newJob.title,
      subject: newJob.subject,
      gradeLevel: 'Varies',
      salaryRange: newJob.salary || 'Competitive',
      postedAt: 'Just now',
      description: newJob.desc
    };
    setJobs([createdJob, ...jobs]);
    setNewJob({ title: '', subject: 'Mathematics', salary: '', desc: '' });
    setView('school-dashboard');
  };

  const handleApply = (id: string) => {
    setAppliedJobs(prev => new Set(prev).add(id));
  };

  const handleAdmissionSubmit = () => {
    if (!admissionForm.childName || !admissionForm.grade) {
      alert("Please provide child name and grade.");
      return;
    }
    const newApp: StudentApplication = {
      id: `app-${Date.now()}`,
      parentId: parentProfile?.id || 'guest',
      schoolId: selectedSchoolForAdmission?.id || '',
      childName: admissionForm.childName,
      gradeLevel: admissionForm.grade,
      statement: admissionForm.statement,
      status: 'PENDING',
      submittedAt: new Date().toLocaleDateString()
    };
    setStudentApplications([newApp, ...studentApplications]);
    setSelectedSchoolForAdmission(null);
    setAdmissionForm({ childName: '', grade: '', statement: '' });
    setView('parent-dashboard');
  };

  const renderHome = () => (
    <div className="max-w-6xl mx-auto px-4 py-20">
      <div className="text-center mb-16 animate-in fade-in duration-700">
        <h1 className="text-6xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
          Where <span className="text-indigo-600 underline underline-offset-8 decoration-indigo-200 dark:decoration-indigo-900">Education</span> Meets Opportunity.
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
          The world's most intelligent platform for educational recruitment and school admission. Intelligent matching for a brighter future.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={() => handleLogin('TEACHER')}
            className="group relative bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 dark:shadow-none overflow-hidden"
          >
            <span className="relative z-10">I am a Teacher</span>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
          <button 
            onClick={() => handleLogin('PARENT')}
            className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 dark:shadow-none"
          >
            I am a Parent
          </button>
          <button 
            onClick={() => handleLogin('SCHOOL')}
            className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-600 dark:border-indigo-400 px-8 py-4 rounded-xl font-bold text-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
          >
            I am a School
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mt-20">
        {[
          { title: "Teacher Matching", desc: "Our AI analyzes pedagogical styles to find the perfect school fit.", icon: "🎯" },
          { title: "Parent Discovery", desc: "Find the best school for your child with detailed institution profiles.", icon: "🏫" },
          { title: "Smart Admissions", desc: "Easy, transparent application process for parents and schools.", icon: "📝" }
        ].map((feat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-4xl mb-4">{feat.icon}</div>
            <h3 className="text-xl font-bold mb-2 dark:text-white">{feat.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderParentDashboard = () => (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <img src={parentProfile?.avatar} className="w-32 h-32 rounded-full border-4 border-indigo-50 dark:border-indigo-900 object-cover mx-auto mb-4 shadow-sm" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{parentProfile?.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">Parent of {parentProfile?.childName}</p>
            <button onClick={() => setView('parent-browse')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 dark:shadow-none">Find More Schools</button>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Admission Tracking</h3>
          <div className="space-y-4">
            {studentApplications.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <p className="text-slate-400 font-medium mb-4">No active applications for your child.</p>
                <button onClick={() => setView('parent-browse')} className="text-indigo-600 font-bold underline">Start Browsing Schools</button>
              </div>
            ) : (
              studentApplications.map(app => {
                const school = schools.find(s => s.id === app.schoolId);
                return (
                  <div key={app.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={school?.logo} className="w-12 h-12 rounded-xl object-cover border border-slate-100 dark:border-slate-800" />
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{school?.name}</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Application for {app.childName} • {app.gradeLevel}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${app.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                        {app.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Sent {app.submittedAt}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBrowseSchools = () => {
    const filteredSchools = schools.filter(school => {
      const matchesSearch = school.name.toLowerCase().includes(schoolSearch.toLowerCase()) || 
                           school.location.toLowerCase().includes(schoolSearch.toLowerCase());
      const matchesCategory = schoolCategory === "All" || school.type.includes(schoolCategory);
      return matchesSearch && matchesCategory;
    });

    const categories = ["All", "IB World", "Private", "Montessori", "Charter"];

    return (
      <div className="max-w-6xl mx-auto px-4 py-12 animate-in slide-in-from-bottom-4 duration-500">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            {role === 'PARENT' ? 'Find the Perfect School' : 'Discover Global Institutions'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            {role === 'PARENT' ? 'Explore elite institutions and apply for your child\'s admission today.' : 'Connect with schools that align with your pedagogical mission.'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between">
          <div className="relative w-full md:w-96">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Search schools by name or location..." 
              value={schoolSearch}
              onChange={(e) => setSchoolSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSchoolCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${schoolCategory === cat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* School Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSchools.map(school => {
            const schoolJobs = jobs.filter(j => j.schoolId === school.id);
            return (
              <div key={school.id} className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
                <div className="h-32 bg-indigo-50 dark:bg-slate-800 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                  <img src={school.logo} className="absolute -bottom-6 left-6 w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-900 object-cover shadow-lg" />
                </div>
                <div className="p-8 pt-10 flex-grow">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{school.name}</h3>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium mb-4">
                    <span>{school.location}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{school.type}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed line-clamp-3 mb-6 italic">"{school.bio}"</p>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {role === 'TEACHER' ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-600 border-2 border-white dark:border-slate-900">
                            {schoolJobs.length}
                          </div>
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Roles</span>
                        </>
                      ) : (
                        <>
                           <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">Open Enrollment</span>
                        </>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        if (role === 'PARENT') {
                          setSelectedSchoolForAdmission(school);
                        } else {
                          setView('teacher-dashboard');
                        }
                      }}
                      className={`${role === 'PARENT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-indigo-600'} dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition`}
                    >
                      {role === 'PARENT' ? 'Apply Now' : 'View Roles'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAdmissionForm = () => {
    if (!selectedSchoolForAdmission) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">School Admission</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Apply for {selectedSchoolForAdmission.name}</p>
            </div>
            <button onClick={() => setSelectedSchoolForAdmission(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Child's Name</label>
              <input 
                type="text" 
                value={admissionForm.childName}
                onChange={e => setAdmissionForm({...admissionForm, childName: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" 
                placeholder="Full Name"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Target Grade</label>
              <input 
                type="text" 
                value={admissionForm.grade}
                onChange={e => setAdmissionForm({...admissionForm, grade: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" 
                placeholder="e.g. Grade 6"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Personal Statement</label>
              <textarea 
                value={admissionForm.statement}
                onChange={e => setAdmissionForm({...admissionForm, statement: e.target.value})}
                className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 resize-none" 
                placeholder="Briefly tell us about your child's interests..."
              ></textarea>
            </div>
          </div>

          <button 
            onClick={handleAdmissionSubmit}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 transition shadow-xl shadow-emerald-100 dark:shadow-none"
          >
            Submit Application
          </button>
        </div>
      </div>
    );
  };

  const renderTeacherDashboard = () => (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <img src={teacherProfile?.avatar} className="w-32 h-32 rounded-full border-4 border-indigo-50 dark:border-indigo-900 object-cover mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{teacherProfile?.name}</h2>
            <p className="text-indigo-600 dark:text-indigo-400 font-semibold mb-6">{teacherProfile?.subject} Specialist</p>
            <button onClick={() => setView('teacher-profile')} className="w-full py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700">Manage Portfolio</button>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Curated Opportunities</h3>
          <div className="space-y-4">
            {jobs.map(job => {
              const match = matchScores[job.id];
              const isApplied = appliedJobs.has(job.id);
              return (
                <div key={job.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition group relative overflow-hidden shadow-sm hover:shadow-md">
                  {match && (
                    <div className="absolute top-0 right-0 px-4 py-1 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-tighter rounded-bl-xl shadow-sm">
                      AI Match: {match.score}%
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xl font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 dark:text-white transition">{job.title}</h4>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Oxford International School • {job.gradeLevel}</p>
                    </div>
                    <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-lg text-sm font-bold border border-emerald-100 dark:border-emerald-800">{job.salaryRange}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">{job.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Posted {job.postedAt}</span>
                    <button onClick={() => handleApply(job.id)} disabled={isApplied} className={`px-8 py-3 rounded-xl font-black text-sm transition active:scale-95 ${isApplied ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200' : 'bg-slate-900 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-700'}`}>
                      {isApplied ? 'Applied' : 'Apply Now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Renders the teacher's profile management view.
   * Fixes error: Cannot find name 'renderMyProfile'.
   */
  const renderMyProfile = () => (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Professional Portfolio</h1>
        <button 
          onClick={() => {
            setIsEditingProfile(!isEditingProfile);
            setEditedProfile(teacherProfile);
          }}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition"
        >
          {isEditingProfile ? 'Cancel Editing' : 'Edit Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
             <div className="relative inline-block mb-6">
               <img src={teacherProfile?.avatar} className="w-40 h-40 rounded-3xl object-cover border-4 border-white dark:border-slate-800 shadow-xl" />
               <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
               </div>
             </div>
             <h2 className="text-2xl font-black text-slate-900 dark:text-white">{teacherProfile?.name}</h2>
             <p className="text-indigo-600 dark:text-indigo-400 font-bold mb-4">{teacherProfile?.subject}</p>
             <div className="flex flex-wrap justify-center gap-2">
               {teacherProfile?.skills.map(skill => (
                 <span key={skill} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-bold uppercase tracking-wider">{skill}</span>
               ))}
             </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 dark:shadow-none">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
              <span className="text-2xl">✨</span> AI Optimizer
            </h3>
            <p className="text-indigo-100 text-sm mb-6 leading-relaxed">Paste your resume or a brief description of your experience, and let our AI polish your bio and extract key skills.</p>
            <textarea 
              value={aiInsight}
              onChange={(e) => setAiInsight(e.target.value)}
              placeholder="Paste resume text here..."
              className="w-full bg-indigo-500/50 border border-indigo-400/50 rounded-2xl p-4 text-white placeholder-indigo-200 outline-none focus:ring-2 focus:ring-white/30 h-32 resize-none mb-4 text-sm"
            ></textarea>
            <button 
              onClick={handleOptimizeProfile}
              disabled={loading || !aiInsight.trim()}
              className="w-full bg-white text-indigo-600 py-3 rounded-xl font-black hover:bg-indigo-50 transition disabled:opacity-50"
            >
              {loading ? 'Optimizing...' : 'Polish Profile'}
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          {isEditingProfile ? (
            <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
               <div className="grid md:grid-cols-2 gap-6">
                 <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Full Name</label>
                   <input 
                     type="text" 
                     value={editedProfile?.name}
                     onChange={e => setEditedProfile(prev => prev ? {...prev, name: e.target.value} : null)}
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Subject</label>
                   <input 
                     type="text" 
                     value={editedProfile?.subject}
                     onChange={e => setEditedProfile(prev => prev ? {...prev, subject: e.target.value} : null)}
                     className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                 </div>
               </div>
               <div>
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Professional Bio</label>
                 <textarea 
                   value={editedProfile?.bio}
                   onChange={e => setEditedProfile(prev => prev ? {...prev, bio: e.target.value} : null)}
                   className="w-full h-40 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                 ></textarea>
               </div>
               <button 
                 onClick={handleSaveProfile}
                 className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition"
               >
                 Save Portfolio Changes
               </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Professional Biography</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
                  {teacherProfile?.bio}
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Education</h4>
                   <p className="text-slate-900 dark:text-white font-bold">{teacherProfile?.education}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Experience</h4>
                   <p className="text-slate-900 dark:text-white font-bold">{teacherProfile?.experienceYears} Years Professional Practice</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSchoolDashboard = () => (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">School Command</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage faculty hiring and student admissions.</p>
        </div>
        <button onClick={() => setView('school-jobs')} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition">Post New Job</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
            <h3 className="font-bold text-xl text-slate-800 dark:text-white">Active Teacher Roles</h3>
            <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-black">{jobs.length}</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {jobs.filter(j => j.schoolId === 's-own' || j.id.startsWith('j')).map(job => (
              <div key={job.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <div><h4 className="font-bold text-slate-900 dark:text-white">{job.title}</h4><p className="text-slate-500 text-xs">{job.subject} • {job.salaryRange}</p></div>
                <button className="text-indigo-600 font-bold text-xs underline">View candidates</button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-900/10 flex justify-between items-center">
            <h3 className="font-bold text-xl text-slate-800 dark:text-white">Student Admissions</h3>
            <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-black">{studentApplications.length}</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {studentApplications.length === 0 ? (
              <p className="p-12 text-center text-slate-400 text-sm italic">No pending admission requests.</p>
            ) : (
              studentApplications.map(app => (
                <div key={app.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{app.childName}</h4>
                    <p className="text-slate-500 text-xs">{app.gradeLevel} • Submitted {app.submittedAt}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Accept</button>
                    <button className="text-slate-400 hover:text-rose-600 transition px-2">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderJobForm = () => (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-in zoom-in duration-300">
      <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">Create Listing</h2>
      <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-8 shadow-xl">
        <input type="text" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} className="w-full px-5 py-4 rounded-2xl border dark:border-slate-700 dark:bg-slate-800 focus:ring-4 focus:ring-indigo-500/10 outline-none transition text-lg font-medium" placeholder="Job Title" />
        <div className="grid md:grid-cols-2 gap-8">
           <select value={newJob.subject} onChange={e => setNewJob({...newJob, subject: e.target.value})} className="w-full px-5 py-4 rounded-2xl border dark:border-slate-700 dark:bg-slate-800 outline-none"><option>Mathematics</option><option>Science</option><option>English</option><option>Arts</option></select>
           <input type="text" value={newJob.salary} onChange={e => setNewJob({...newJob, salary: e.target.value})} className="w-full px-5 py-4 rounded-2xl border dark:border-slate-700 dark:bg-slate-800 outline-none" placeholder="Salary Range" />
        </div>
        <textarea value={newJob.desc} onChange={e => setNewJob({...newJob, desc: e.target.value})} className="w-full px-5 py-4 rounded-2xl border dark:border-slate-700 dark:bg-slate-800 outline-none h-48 resize-none" placeholder="Role Description"></textarea>
        <button onClick={handlePublishJob} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition">Publish Active Listing</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar role={role} onLogout={handleLogout} onNavigate={setView} isDark={isDark} toggleTheme={toggleTheme} />
      
      <main className="flex-grow">
        {loading && <div className="fixed top-0 left-0 w-full h-1 bg-indigo-100 dark:bg-indigo-900 overflow-hidden z-[60]"><div className="h-full bg-indigo-600 animate-[loading_1s_infinite_ease-in-out]"></div></div>}
        {view === 'home' && renderHome()}
        {view === 'teacher-dashboard' && renderTeacherDashboard()}
        {view === 'parent-dashboard' && renderParentDashboard()}
        {view === 'teacher-browse' && renderBrowseSchools()}
        {view === 'parent-browse' && renderBrowseSchools()}
        {view === 'school-dashboard' && renderSchoolDashboard()}
        {view === 'teacher-profile' && renderMyProfile()}
        {view === 'school-jobs' && renderJobForm()}

        {selectedSchoolForAdmission && renderAdmissionForm()}
      </main>

      <footer className="bg-slate-900 dark:bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center mb-6">
              <div className="bg-indigo-500 text-white p-2 rounded-xl mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-2xl font-black tracking-tight">EduConnect</span>
            </div>
            <p className="text-slate-400 dark:text-slate-500 max-w-sm leading-relaxed mb-8">
              The unified platform for schools, educators, and parents. Bridging the gap in modern education.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-indigo-400 mb-6 uppercase tracking-widest text-xs">Community</h5>
            <ul className="space-y-4 text-slate-300 dark:text-slate-400 font-medium">
              <li><button onClick={() => setView('teacher-browse')} className="hover:text-white transition">Schools</button></li>
              <li><button onClick={() => handleLogin('PARENT')} className="hover:text-white transition">Parents</button></li>
              <li><button onClick={() => handleLogin('TEACHER')} className="hover:text-white transition">Teachers</button></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-indigo-400 mb-6 uppercase tracking-widest text-xs">Support</h5>
            <ul className="space-y-4 text-slate-300 dark:text-slate-400 font-medium">
              <li><a href="#" className="hover:text-white transition">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition">Safety</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-slate-800 flex justify-between items-center text-slate-500 text-sm">
          <p>&copy; 2025 EduConnect Global Inc.</p>
        </div>
      </footer>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
