"use client";
import React from "react";
import { PencilIcon } from "@heroicons/react/24/outline";

const Faq = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 animate-fade-in">
            {/* FAQ Section */}
            <section className="space-y-4">
                <h2 className="text-3xl font-bold text-elmar-secondary mb-4">Veelgestelde Vragen</h2>

                {[
                    {
                        question: "How do I create an account?",
                        answer:
                            'Click the "Sign Up" button in the top right corner and follow the registration process.',
                        checked: true,
                    },
                    {
                        question: "I forgot my password. What should I do?",
                        answer:
                            'Click on "Forgot Password" on the login page and follow the instructions sent to your email.',
                    },
                    {
                        question: "How do I update my profile information?",
                        answer:
                            'Go to "My Account" settings and select "Edit Profile" to make changes.',
                    },
                ].map(({ question, answer, checked }, index) => (
                    <div
                        key={index}
                        className="collapse collapse-plus bg-white border border-base-300 rounded-lg shadow-sm"
                    >
                        <input
                            type="radio"
                            name="faq-accordion"
                            defaultChecked={checked}
                        />
                        <div className="collapse-title font-semibold text-lg text-gray-800">
                            {question}
                        </div>
                        <div className="collapse-content text-sm text-gray-600">
                            {answer}
                        </div>
                    </div>
                ))}
            </section>

            {/* Contact Form */}
            <section className="card bg-white shadow-elmar-card rounded-2xl overflow-hidden border border-elmar-base-300">
                <div className="card-body p-8">
                    <h2 className="text-2xl font-bold text-elmar-secondary mb-6 flex items-center gap-3">
                        <PencilIcon className="w-6 h-6 text-elmar-primary" />
                        Contactformulier
                    </h2>

                    <form className="space-y-8">
                        {/* Row: First Name & Last Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-control">
                                <label htmlFor="fname" className="label">
                                    <span className="label-text font-semibold text-gray-700">👤 Voornaam</span>
                                </label>
                                <input
                                    type="text"
                                    id="fname"
                                    name="fname"
                                    placeholder="Bijv. Jan"
                                    className="input input-bordered w-full"
                                    required
                                />
                            </div>

                            <div className="form-control">
                                <label htmlFor="lname" className="label">
                                    <span className="label-text font-semibold text-gray-700">👤 Achternaam</span>
                                </label>
                                <input
                                    type="text"
                                    id="lname"
                                    name="lname"
                                    placeholder="Bijv. Jansen"
                                    className="input input-bordered w-full"
                                    required
                                />
                            </div>
                        </div>

                        {/* Row: Email & Phone */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-control">
                                <label htmlFor="email" className="label">
                                    <span className="label-text font-semibold text-gray-700">📧 E-mailadres</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    placeholder="voorbeeld@mail.com"
                                    className="input input-bordered w-full"
                                    required
                                />
                            </div>

                            <div className="form-control">
                                <label htmlFor="phone" className="label">
                                    <span className="label-text font-semibold text-gray-700">📞 Telefoonnummer</span>
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    pattern="^\+\d{1,3}-\d{3}-\d{6,10}$"
                                    placeholder="+123-456-123456"
                                    className="input input-bordered w-full"
                                />
                            </div>
                        </div>

                        {/* Description / Message */}
                        <div className="form-control">
                            <label htmlFor="description" className="label">
                                <span className="label-text font-semibold text-gray-700">📝 Beschrijving</span>
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                placeholder="Vertel ons waar je hulp bij nodig hebt..."
                                className="textarea textarea-bordered w-full h-32 resize-none"
                                required
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <button type="submit" className="btn btn-primary px-8 py-2">
                                Versturen
                            </button>
                        </div>
                    </form>

                </div>
            </section>
        </div>
    );
};

export default Faq;
